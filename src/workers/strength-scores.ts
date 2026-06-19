import { Worker } from "bullmq"
import { prisma } from "@/lib/prisma"
import { bullMQConnection, redis } from "@/lib/redis"
import { computeTopicScore } from "@/lib/strength"

interface StrengthJobData {
  userId: string
  tagIds: string[]
}

const worker = new Worker<StrengthJobData>(
  "strength-scores",
  async (job) => {
    const { userId, tagIds } = job.data

    for (const tagSlug of tagIds) {
      // tagIds might be tag names or IDs, handle both
      let tag = await prisma.tag.findUnique({ where: { id: tagSlug } })
      if (!tag) {
        tag = await prisma.tag.findUnique({ where: { name: tagSlug } })
      }
      if (!tag) continue

      const { score, trend, acCount, totalAttempts, avgAttempts } =
        await computeTopicScore(userId, tag.id)

      await prisma.topicScore.upsert({
        where: { userId_tagId: { userId, tagId: tag.id } },
        create: {
          userId,
          tagId: tag.id,
          score,
          trend,
          acCount,
          totalAttempts,
          avgAttempts,
        },
        update: {
          score,
          trend,
          acCount,
          totalAttempts,
          avgAttempts,
          lastUpdated: new Date(),
        },
      })
    }

    // Update Redis leaderboard sorted set
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true },
    })
    if (user) {
      await redis.zadd("leaderboard:global", {
        score: user.xp,
        member: userId,
      })
    }
  },
  { connection: bullMQConnection }
)

worker.on("completed", (job) => {
  console.log(`Strength scores recomputed for job ${job.id}`)
})

worker.on("failed", (job, err) => {
  console.error(`Strength scores failed for job ${job?.id}:`, err)
})

export default worker
