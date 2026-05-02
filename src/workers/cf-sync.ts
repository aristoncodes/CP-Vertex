import { Worker } from "bullmq"
import { prisma } from "@/lib/prisma"
import { bullMQConnection } from "@/lib/redis"
import { getCFSubmissions, getCFRatingHistory, CFSubmission } from "@/lib/cf-api"
import { calculateXP, getWACountBeforeAC, awardXP, isWeakTag } from "@/lib/xp"
import { recomputeTopicScore } from "@/lib/strength"
import { generateCoachInsights } from "@/lib/coach"
import { emitXPGain, emitLevelUp, emitUpsolveComplete } from "@/lib/realtime"
import { redis } from "@/lib/redis"
import {
  detectUpsolveItems,
  detectDivisionFromName,
  getUserContestSettings,
  refreshMultipliers,
  checkAdaptiveTarget,
  getXPMultiplier,
} from "@/lib/upsolve"
import { scheduleReminders, cancelReminders } from "@/workers/upsolve-reminders"

interface CFSyncJobData {
  userId: string
  cfHandle: string
  lastSyncAt: string | null
}

// Helper to get contest end time from CF rating history
async function getContestEndTime(cfHandle: string, contestId: number): Promise<Date> {
  try {
    const history = await getCFRatingHistory(cfHandle)
    const entry = history.find((h) => h.contestId === contestId)
    if (entry) {
      return new Date(entry.ratingUpdateTimeSeconds * 1000)
    }
  } catch {
    // ignore
  }
  // Fallback: assume 2 hours before now for unknown contests
  return new Date(Date.now() - 2 * 60 * 60 * 1000)
}

const worker = new Worker<CFSyncJobData>(
  "cf-sync",
  async (job) => {
    const { userId, cfHandle, lastSyncAt } = job.data
    const lastSync = lastSyncAt ? new Date(lastSyncAt) : null

    // 1. Fetch new submissions since last sync
    const submissions = await getCFSubmissions(cfHandle, 1, 100)
    const newSubs = submissions.filter((sub) => {
      const subDate = new Date(sub.creationTimeSeconds * 1000)
      return !lastSync || subDate > lastSync
    })

    if (newSubs.length === 0) return

    // ── Group by contestId for upsolve detection ───────────────
    const contestGroups: Record<number, CFSubmission[]> = {}
    for (const sub of newSubs) {
      if (!sub.contestId) continue
      if (!contestGroups[sub.contestId]) contestGroups[sub.contestId] = []
      contestGroups[sub.contestId].push(sub)
    }

    // Fetch user join date — only track contests after they joined CP Vertex
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    })
    const joinedAt = userRecord?.createdAt ?? new Date(0)

    // Rated contests only (CONTESTANT participant type) AND after user joined
    const ratedContestIds = await Promise.all(
      Object.keys(contestGroups)
        .map(Number)
        .filter((cid) =>
          contestGroups[cid].some(
            (s) => s.author?.participantType === "CONTESTANT"
          )
        )
        .map(async (cid) => {
          const endTime = await getContestEndTime(cfHandle, cid)
          return endTime >= joinedAt ? cid : null
        })
    ).then((results) => results.filter((id): id is number => id !== null))

    for (const sub of newSubs) {
      if (!sub.problem.rating) continue
      const cfId = `${sub.problem.contestId}${sub.problem.index}`

      // Ensure problem exists
      let problem = await prisma.problem.findUnique({
        where: { cfId },
        include: { tags: true },
      })

      if (!problem) {
        problem = await prisma.problem.create({
          data: {
            cfId,
            cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
            title: sub.problem.name,
            rating: sub.problem.rating,
            contestId: sub.problem.contestId,
          },
          include: { tags: true },
        })
      }

      // 2. Upsert submission record
      const existing = await prisma.submission.findUnique({
        where: { cfSubmissionId: String(sub.id) },
      })
      if (existing) continue

      await prisma.submission.create({
        data: {
          userId,
          cfSubmissionId: String(sub.id),
          problemId: problem.id,
          verdict: sub.verdict,
          language: sub.programmingLanguage,
          timeMs: sub.timeConsumedMillis,
          memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
          submittedAt: new Date(sub.creationTimeSeconds * 1000),
        },
      })

      // 3. If AC — award XP + check for upsolve completion
      if (sub.verdict === "OK") {
        const tagIds = problem.tags.map((t) => t.tagId)

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { level: true },
        })
        const userLevel = user?.level || 1

        const waCount = await getWACountBeforeAC(userId, problem.id)
        const isClean = waCount === 0
        const weakTag = await isWeakTag(userId, tagIds)
        const xp = calculateXP(sub.problem.rating, userLevel, isClean, weakTag)

        const { xpAwarded, newLevel, leveledUp } = await awardXP(userId, xp, "solve")

        await prisma.submission.updateMany({
          where: { cfSubmissionId: String(sub.id) },
          data: { xpAwarded },
        })

        for (const tagId of tagIds) {
          await recomputeTopicScore(userId, tagId)
        }

        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { xp: true },
        })
        if (currentUser) {
          await redis.zadd("leaderboard:global", {
            score: currentUser.xp,
            member: userId,
          })
        }

        await emitXPGain(userId, xpAwarded, "solve")
        if (leveledUp) {
          await emitLevelUp(userId, newLevel)
        }

        // ── Check if this was a pending upsolve ───────────────
        const upsolveItem = await prisma.upsolveItem.findFirst({
          where: { userId, problemId: problem.id, status: "pending" },
          include: { contestParticipation: true },
        })

        if (upsolveItem) {
          const bonusXP = Math.floor(
            (sub.problem.rating || 1000) * upsolveItem.xpMultiplier
          )

          await Promise.all([
            prisma.upsolveItem.update({
              where: { id: upsolveItem.id },
              data: { status: "solved", solvedAt: new Date() },
            }),
            prisma.user.update({
              where: { id: userId },
              data: { xp: { increment: bonusXP } },
            }),
            emitUpsolveComplete(userId, problem.title, bonusXP),
          ])

          // Cancel reminders if all target items for this contest are now solved
          const remainingPending = await prisma.upsolveItem.count({
            where: {
              userId,
              contestParticipationId: upsolveItem.contestParticipationId,
              status: "pending",
              category: "target",
            },
          })
          if (remainingPending === 0) {
            await cancelReminders(
              userId,
              upsolveItem.contestParticipation.contestId
            )
          }

          // Update upsolve streak
          await updateUpsolveStreak(userId)
        }
      }
    }

    // ── 4. Process new rated contests for upsolve detection ───
    for (const contestId of ratedContestIds) {
      // Skip already processed contests
      const existing = await prisma.contestParticipation.findUnique({
        where: { userId_contestId: { userId, contestId } },
      })
      if (existing) continue

      const contestSubs = contestGroups[contestId]
      const contestEndTime = await getContestEndTime(cfHandle, contestId)

      // Get contest name from submissions (all should have same contest name)
      const contestName =
        `Codeforces Round ${contestId}` // fallback name

      // Fetch rating change info for this contest
      let ratingBefore: number | null = null
      let ratingAfter: number | null = null
      let ratingChange: number | null = null
      let rank: number | null = null

      try {
        const ratingHistory = await getCFRatingHistory(cfHandle)
        const entry = ratingHistory.find((h) => h.contestId === contestId)
        if (entry) {
          ratingBefore = entry.oldRating
          ratingAfter = entry.newRating
          ratingChange = entry.newRating - entry.oldRating
          rank = entry.rank
        }
      } catch {
        // ignore rating fetch errors
      }

      const division = detectDivisionFromName(contestName)
      const problemsSolved = contestSubs.filter((s) => s.verdict === "OK").length

      // Create ContestParticipation record
      let participation: { id: string; contestId: number }
      try {
        participation = await prisma.contestParticipation.create({
          data: {
            userId,
            contestId,
            contestName,
            division,
            ratingBefore,
            ratingAfter,
            ratingChange,
            rank,
            problemsSolved,
            participatedAt: contestEndTime,
          },
        })
      } catch {
        // Already exists race condition
        const existing2 = await prisma.contestParticipation.findUnique({
          where: { userId_contestId: { userId, contestId } },
        })
        if (!existing2) continue
        participation = existing2
      }

      // Detect unsolved problems
      const upsolveInputs = await detectUpsolveItems(
        userId,
        contestId,
        contestName,
        contestEndTime,
        newSubs
      )

      let targetItemCount = 0

      for (const input of upsolveInputs) {
        // Ensure problem exists in DB
        const problem = await prisma.problem.findUnique({
          where: { cfId: input.problemCfId },
        })
        if (!problem) continue

        // Skip if already have this upsolve item
        const alreadyExists = await prisma.upsolveItem.findFirst({
          where: { userId, problemId: problem.id },
        })
        if (alreadyExists) continue

        await prisma.upsolveItem.create({
          data: {
            userId,
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

        if (input.category === "target") targetItemCount++
      }

      // Schedule reminders if there are target items
      if (targetItemCount > 0) {
        await scheduleReminders(userId, contestId, contestName, targetItemCount)

        // Show banner notification on next login
        await prisma.notification.create({
          data: {
            userId,
            type: "upsolve_reminder",
            title: "Upsolve queue updated 📬",
            message: `${contestName} ended — ${targetItemCount} problem${targetItemCount > 1 ? "s" : ""} in your upsolve queue. 2× XP for 24h!`,
            contestId: String(contestId),
          },
        })
      }

      // Check adaptive targets after each contest
      await checkAdaptiveTarget(userId, division)
    }

    // 5. Refresh XP multipliers for pending upsolve items
    await refreshMultipliers(userId)

    // 6. Run coach insights
    await generateCoachInsights(userId)

    // 7. Update sync timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { cfLastSync: new Date() },
    })
  },
  { connection: bullMQConnection }
)

async function updateUpsolveStreak(userId: string): Promise<void> {
  // Check if user solved an upsolve within 72h of any recent contest
  const recentSolves = await prisma.upsolveItem.count({
    where: {
      userId,
      status: "solved",
      solvedAt: {
        gte: new Date(Date.now() - 72 * 60 * 60 * 1000),
      },
    },
  })
  if (recentSolves > 0) {
    // Just log for now — can be extended to a full streak system
    console.log(`User ${userId} has upsolve activity within 72h`)
  }
}

worker.on("completed", (job) => {
  console.log(`CF sync completed for job ${job.id}`)
})

worker.on("failed", (job, err) => {
  console.error(`CF sync failed for job ${job?.id}:`, err)
})

export default worker
