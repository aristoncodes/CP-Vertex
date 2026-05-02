import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFSubmissions, getCFUser, getCFRatingHistory, CFSubmission, fetchAllSubmissions } from "@/lib/cf-api"
import { NextRequest } from "next/server"
import { recomputeTopicScore } from "@/lib/strength"
import {
  detectUpsolveItems,
  detectDivisionFromName,
  refreshMultipliers,
  checkAdaptiveTarget,
} from "@/lib/upsolve"
import { emitUpsolveComplete } from "@/lib/realtime"
import { scheduleReminders, cancelReminders } from "@/workers/upsolve-reminders"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || !user.cfHandle) {
      return Response.json({ error: "No Codeforces handle connected" }, { status: 400 });
    }

    // Support ?full=true to force a complete historical re-import
    const url = new URL(request.url);
    const fullSync = url.searchParams.get("full") === "true";

    // Check if synced recently (e.g., within 5 mins) to prevent spam
    // Full re-sync bypasses this — it's a deliberate one-time operation
    if (!fullSync && user.cfLastSync) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (user.cfLastSync > fiveMinsAgo) {
        return Response.json({ error: "Please wait 5 minutes between manual syncs." }, { status: 429 });
      }
    }

    // ── Fetch submissions ONCE — reused for import + upsolve ──
    const submissions = (fullSync || !user.cfLastSync)
      ? await fetchAllSubmissions(user.cfHandle)
      : await getCFSubmissions(user.cfHandle, 1, 500);

    // ── Phase 1: Batch import submissions ──────────────────────
    // Pre-fetch existing problems and submissions in bulk
    const allCfIds = [...new Set(submissions.map(s => `${s.problem.contestId}${s.problem.index}`))];
    const existingProblems = await prisma.problem.findMany({
      where: { cfId: { in: allCfIds } },
    });
    const problemMap = new Map(existingProblems.map(p => [p.cfId, p]));

    const allSubIds = submissions.map(s => String(s.id));
    const existingSubs = await prisma.submission.findMany({
      where: { cfSubmissionId: { in: allSubIds } },
      select: { cfSubmissionId: true },
    });
    const existingSubSet = new Set(existingSubs.map(s => s.cfSubmissionId));

    // Pre-fetch existing tags
    const allTagNames = [...new Set(submissions.flatMap(s => s.problem.tags || []))];
    const existingTags = await prisma.tag.findMany({
      where: { name: { in: allTagNames } },
    });
    const tagMap = new Map(existingTags.map(t => [t.name, t]));

    let imported = 0;
    const tagsToRecompute = new Set<string>();

    for (const sub of submissions) {
      const subDate = new Date(sub.creationTimeSeconds * 1000);
      // For full sync, don't skip anything
      if (!fullSync && user.cfLastSync && subDate <= user.cfLastSync) continue;

      const cfId = `${sub.problem.contestId}${sub.problem.index}`;

      // Get or create problem (use cache, only hit DB on miss)
      let problem = problemMap.get(cfId);
      if (!problem) {
        try {
          problem = await prisma.problem.create({
            data: {
              cfId,
              cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
              title: sub.problem.name,
              rating: sub.problem.rating || 0,
              contestId: sub.problem.contestId,
            },
          });
        } catch {
          // Race condition: another request created it
          problem = await prisma.problem.findUnique({ where: { cfId } }) ?? undefined;
          if (!problem) continue;
        }
        problemMap.set(cfId, problem);
      }

      // Process tags (cached)
      const tags = sub.problem.tags || [];
      for (const tagName of tags) {
        let tag = tagMap.get(tagName);
        if (!tag) {
          try {
            tag = await prisma.tag.create({ data: { name: tagName, category: "general" } });
          } catch {
            tag = await prisma.tag.findUnique({ where: { name: tagName } }) ?? undefined;
            if (!tag) continue;
          }
          tagMap.set(tagName, tag);
        }
        tagsToRecompute.add(tag.id);

        await prisma.problemTag.upsert({
          where: { problemId_tagId: { problemId: problem.id, tagId: tag.id } },
          create: { problemId: problem.id, tagId: tag.id },
          update: {},
        });
      }

      // Skip if submission already exists (use pre-fetched set)
      if (existingSubSet.has(String(sub.id))) continue;

      await prisma.submission.create({
        data: {
          userId: user.id,
          cfSubmissionId: String(sub.id),
          problemId: problem.id,
          verdict: sub.verdict,
          language: sub.programmingLanguage,
          timeMs: sub.timeConsumedMillis,
          memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
          submittedAt: subDate,
        },
      });
      existingSubSet.add(String(sub.id));

      imported++;
    }

    // Recompute topic scores for modified tags
    for (const tagId of Array.from(tagsToRecompute)) {
      await recomputeTopicScore(user.id, tagId);
    }

    // Sync CF Rating
    let cfRating = user.cfRating;
    try {
      const userInfo = await getCFUser(user.cfHandle);
      if (userInfo && userInfo.length > 0 && userInfo[0].rating) {
        cfRating = userInfo[0].rating;
      }
    } catch (e) {
      console.warn("Could not fetch CF user info for rating", e);
    }

    // Recompute streak
    const allOKSubmissions = await prisma.submission.findMany({
      where: { userId: user.id, verdict: "OK" },
      select: { submittedAt: true },
      orderBy: { submittedAt: "desc" }
    });
    
    // Group by unique date strings (YYYY-MM-DD UTC)
    const uniqueDates = Array.from(new Set(allOKSubmissions.map(s => s.submittedAt.toISOString().split("T")[0])));
    
    let currentStreak = 0;
    const today = new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];

    // Check if streak is active (today or yesterday)
    let lastActiveDay: Date | null = null;
    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
      let checkDate = uniqueDates.includes(today) ? new Date() : yesterdayDate;
      lastActiveDay = new Date(checkDate);
      while (true) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (uniqueDates.includes(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        cfLastSync: new Date(),
        cfRating: cfRating,
        streakCurrent: currentStreak,
        streakLongest: Math.max(user.streakLongest, currentStreak),
        ...(lastActiveDay ? { streakLastDay: lastActiveDay } : {})
      }
    });

    // ── Phase 2: Upsolve Detection (reuse submissions) ─────────
    try {
      // Group by contestId (reuse already-fetched submissions)
      const contestGroups: Record<number, CFSubmission[]> = {}
      for (const sub of submissions) {
        if (!sub.contestId) continue
        if (!contestGroups[sub.contestId]) contestGroups[sub.contestId] = []
        contestGroups[sub.contestId].push(sub)
      }

      // Get rating history for contest end times + names
      let ratingHistory: Awaited<ReturnType<typeof getCFRatingHistory>> = []
      try { ratingHistory = await getCFRatingHistory(user.cfHandle) } catch { /* ignore */ }

      // Pre-fetch all existing contest participations in bulk
      const contestIds = Object.keys(contestGroups).map(Number)
      const existingParticipations = await prisma.contestParticipation.findMany({
        where: { userId: user.id, contestId: { in: contestIds } },
      })
      const participationMap = new Map(existingParticipations.map(p => [p.contestId, p]))

      for (const [cidStr, contestSubs] of Object.entries(contestGroups)) {
        const contestId = Number(cidStr)

        // Only rated (CONTESTANT) participations
        const isRated = contestSubs.some(
          (s) => s.author?.participantType === "CONTESTANT"
        )
        if (!isRated) continue

        // Get contest info from rating history
        const ratingEntry = ratingHistory.find((h) => h.contestId === contestId)
        const contestEndTime = ratingEntry
          ? new Date(ratingEntry.ratingUpdateTimeSeconds * 1000)
          : new Date(Math.max(...contestSubs.map((s) => s.creationTimeSeconds)) * 1000)

        // Only track contests after user joined CP Vertex
        if (contestEndTime < user.createdAt) continue

        // Check already processed contests (from pre-fetched map)
        const existing = participationMap.get(contestId)
        if (existing) {
          // Still check if any pending upsolve was solved
          const pendingItems = await prisma.upsolveItem.findMany({
            where: { userId: user.id, contestParticipationId: existing.id, status: "pending" },
            include: { problem: true, contestParticipation: true },
          })
          for (const item of pendingItems) {
            const solved = contestSubs.some(
              (s) => `${s.problem.contestId}${s.problem.index}` === item.problem.cfId && s.verdict === "OK"
            )
            if (solved) {
              const bonusXP = Math.floor((item.problem.rating || 1000) * item.xpMultiplier)
              await Promise.all([
                prisma.upsolveItem.update({ where: { id: item.id }, data: { status: "solved", solvedAt: new Date() } }),
                prisma.user.update({ where: { id: user.id }, data: { xp: { increment: bonusXP } } }),
                emitUpsolveComplete(user.id, item.problem.title, bonusXP),
              ])
              // Cancel reminders if all target items solved
              const remaining = await prisma.upsolveItem.count({
                where: { userId: user.id, contestParticipationId: existing.id, status: "pending", category: "target" },
              })
              if (remaining === 0) await cancelReminders(user.id, contestId)
            }
          }
          continue
        }

        const contestName = ratingEntry?.contestName ?? `Codeforces Round ${contestId}`
        const division = detectDivisionFromName(contestName)
        const problemsSolved = contestSubs.filter((s) => s.verdict === "OK").length

        // Create ContestParticipation
        let participation: { id: string; contestId: number }
        try {
          participation = await prisma.contestParticipation.create({
            data: {
              userId: user.id,
              contestId,
              contestName,
              division,
              ratingBefore: ratingEntry?.oldRating ?? null,
              ratingAfter: ratingEntry?.newRating ?? null,
              ratingChange: ratingEntry ? ratingEntry.newRating - ratingEntry.oldRating : null,
              rank: ratingEntry?.rank ?? null,
              problemsSolved,
              participatedAt: contestEndTime,
            },
          })
        } catch { continue }

        // Detect unsolved problems (pass already-fetched submissions)
        const upsolveInputs = await detectUpsolveItems(
          user.id, contestId, contestName, contestEndTime, submissions
        )

        let targetCount = 0
        for (const input of upsolveInputs) {
          // Reuse problem map from Phase 1
          let problem = problemMap.get(input.problemCfId)
          if (!problem) {
            try {
              problem = await prisma.problem.create({
                data: {
                  cfId: input.problemCfId,
                  cfLink: `https://codeforces.com/problemset/problem/${contestId}/${input.problemCfId.replace(String(contestId), "")}`,
                  title: input.problemName,
                  rating: input.problemRating,
                  contestId: contestId,
                }
              })
            } catch {
              problem = await prisma.problem.findUnique({ where: { cfId: input.problemCfId } }) ?? undefined
              if (!problem) continue
            }
            problemMap.set(input.problemCfId, problem)
          }
          const alreadyExists = await prisma.upsolveItem.findFirst({
            where: { userId: user.id, problemId: problem.id },
          })
          if (alreadyExists) continue
          await prisma.upsolveItem.create({
            data: {
              userId: user.id,
              contestParticipationId: participation.id,
              problemId: problem.id,
              type: input.type,
              category: input.category,
              attemptCount: input.attemptCount,
              lastVerdict: input.lastVerdict,
              priority: input.priority,
              xpMultiplier: input.xpMultiplier,
              deadlineAt: input.deadlineAt,
            },
          })
          if (input.category === "target") targetCount++
        }

        if (targetCount > 0) {
          await scheduleReminders(user.id, contestId, contestName, targetCount)
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "upsolve_reminder",
              title: "Upsolve queue updated 📬",
              message: `${contestName} — ${targetCount} problem${targetCount > 1 ? "s" : ""} in your upsolve queue. 2× XP for 24h!`,
              contestId: String(contestId),
            },
          })
        }

        await checkAdaptiveTarget(user.id, division)
      }

      // Refresh XP multipliers for all pending items
      await refreshMultipliers(user.id)
    } catch (upsolveErr) {
      // Don't fail the whole sync if upsolve detection errors
      console.warn("Upsolve detection error:", upsolveErr)
    }

    return Response.json({ message: "Sync complete", imported });
  } catch (error) {
    console.error("POST /api/user/cf-handle/sync error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
