import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFSubmissions, getCFUser, getCFRatingHistory, CFSubmission } from "@/lib/cf-api"
import { NextRequest } from "next/server"
import { recomputeTopicScore } from "@/lib/strength"
import {
  detectUpsolveItems,
  detectDivisionFromName,
  getUserContestSettings,
  refreshMultipliers,
  checkAdaptiveTarget,
  getXPMultiplier,
} from "@/lib/upsolve"
import { scheduleReminders, cancelReminders } from "@/workers/upsolve-reminders"
import { emitUpsolveComplete } from "@/lib/realtime"
import { calculateXP, getWACountBeforeAC, awardXP, isWeakTag } from "@/lib/xp"

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

    // Check if synced recently (e.g., within 5 mins) to prevent spam
    if (user.cfLastSync) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (user.cfLastSync > fiveMinsAgo) {
        return Response.json({ error: "Please wait 5 minutes between manual syncs." }, { status: 429 });
      }
    }

    // Fetch recent submissions
    const submissions = await getCFSubmissions(user.cfHandle, 1, 100);
    let imported = 0;
    const tagsToRecompute = new Set<string>();

    for (const sub of submissions) {
      const subDate = new Date(sub.creationTimeSeconds * 1000);
      if (user.cfLastSync && subDate <= user.cfLastSync) continue;

      const cfId = `${sub.problem.contestId}${sub.problem.index}`;

      let problem = await prisma.problem.findUnique({ where: { cfId } });
      if (!problem) {
        problem = await prisma.problem.create({
          data: {
            cfId,
            cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
            title: sub.problem.name,
            rating: sub.problem.rating || 0,
            contestId: sub.problem.contestId,
          },
        });
      }

      // Process tags
      const tags = sub.problem.tags || [];
      for (const tagName of tags) {
        let tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await prisma.tag.create({ data: { name: tagName, category: "general" } });
        }
        tagsToRecompute.add(tag.id);

        await prisma.problemTag.upsert({
          where: { problemId_tagId: { problemId: problem.id, tagId: tag.id } },
          create: { problemId: problem.id, tagId: tag.id },
          update: {},
        });
      }

      // Upsert submission
      const existing = await prisma.submission.findUnique({
        where: { cfSubmissionId: String(sub.id) },
      });
      if (existing) continue;

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
    
    // Group by unique date strings (local or UTC, let's use YYYY-MM-DD UTC)
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

    // ── Upsolve Detection ─────────────────────────────────────
    // Only process contests that happened after the user joined CP Vertex
    try {
      const allSubs = await getCFSubmissions(user.cfHandle, 1, 200)

      // Group by contestId
      const contestGroups: Record<number, CFSubmission[]> = {}
      for (const sub of allSubs) {
        if (!sub.contestId) continue
        if (!contestGroups[sub.contestId]) contestGroups[sub.contestId] = []
        contestGroups[sub.contestId].push(sub)
      }

      // Get rating history for contest end times + names
      let ratingHistory: Awaited<ReturnType<typeof getCFRatingHistory>> = []
      try { ratingHistory = await getCFRatingHistory(user.cfHandle) } catch { /* ignore */ }

      for (const [cidStr, contestSubs] of Object.entries(contestGroups)) {
        const contestId = Number(cidStr)

        // Only rated (CONTESTANT) participations
        const isRated = contestSubs.some(
          (s) => (s as CFSubmission & { author?: { participantType?: string } })
            .author?.participantType === "CONTESTANT"
        )
        if (!isRated) continue

        // Get contest info from rating history
        const ratingEntry = ratingHistory.find((h) => h.contestId === contestId)
        const contestEndTime = ratingEntry
          ? new Date(ratingEntry.ratingUpdateTimeSeconds * 1000)
          : new Date(Math.max(...contestSubs.map((s) => s.creationTimeSeconds)) * 1000)

        // Only track contests after user joined CP Vertex
        if (contestEndTime < user.createdAt) continue

        // Skip already processed contests
        const existing = await prisma.contestParticipation.findUnique({
          where: { userId_contestId: { userId: user.id, contestId } },
        })
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

        // Detect unsolved problems
        const upsolveInputs = await detectUpsolveItems(
          user.id, contestId, contestName, contestEndTime, allSubs
        )

        let targetCount = 0
        for (const input of upsolveInputs) {
          let problem = await prisma.problem.findUnique({ where: { cfId: input.problemCfId } })
          if (!problem) {
            problem = await prisma.problem.create({
              data: {
                cfId: input.problemCfId,
                cfLink: `https://codeforces.com/problemset/problem/${contestId}/${input.problemCfId.replace(String(contestId), "")}`,
                title: input.problemName,
                rating: input.problemRating,
                contestId: contestId,
              }
            })
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
