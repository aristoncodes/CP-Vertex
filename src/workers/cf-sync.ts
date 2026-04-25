import { Worker } from "bullmq"
import { prisma } from "@/lib/prisma"
import { bullMQConnection } from "@/lib/redis"
import { getCFSubmissions } from "@/lib/cf-api"
import { calculateXP, getWACountBeforeAC, awardXP, isWeakTag } from "@/lib/xp"
import { recomputeTopicScore } from "@/lib/strength"
import { generateCoachInsights } from "@/lib/coach"
import { emitXPGain, emitLevelUp } from "@/lib/realtime"
import { redis } from "@/lib/redis"

interface CFSyncJobData {
  userId: string
  cfHandle: string
  lastSyncAt: string | null
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

      // 3. If AC — award XP + queue downstream jobs
      if (sub.verdict === "OK") {
        const tagIds = problem.tags.map((t) => t.tagId)
        
        // Fetch user level to calculate XP correctly
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { level: true }
        })
        const userLevel = user?.level || 1

        const waCount = await getWACountBeforeAC(userId, problem.id)
        const isClean = waCount === 0
        const weakTag = await isWeakTag(userId, tagIds)
        const xp = calculateXP(sub.problem.rating, userLevel, isClean, weakTag)

        const { xpAwarded, newLevel, leveledUp } = await awardXP(userId, xp, "solve")

        // Update submission XP
        await prisma.submission.updateMany({
          where: { cfSubmissionId: String(sub.id) },
          data: { xpAwarded },
        })

        // Recompute topic scores
        for (const tagId of tagIds) {
          await recomputeTopicScore(userId, tagId)
        }

        // Update Redis leaderboard
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

        // Emit realtime XP event
        await emitXPGain(userId, xpAwarded, "solve")
        if (leveledUp) {
          await emitLevelUp(userId, newLevel)
        }
      }
    }

    // 4. Run coach insights
    await generateCoachInsights(userId)

    // 5. Update sync timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { cfLastSync: new Date() },
    })
  },
  { connection: bullMQConnection }
)

worker.on("completed", (job) => {
  console.log(`CF sync completed for job ${job.id}`)
})

worker.on("failed", (job, err) => {
  console.error(`CF sync failed for job ${job?.id}:`, err)
})

export default worker
