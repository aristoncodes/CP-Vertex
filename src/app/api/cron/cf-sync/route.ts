import { prisma } from "@/lib/prisma"
import { getCFSubmissions } from "@/lib/cf-api"
import { calculateXP, getWACountBeforeAC, awardXP, isWeakTag } from "@/lib/xp"
import { recomputeTopicScore } from "@/lib/strength"
import { generateCoachInsights } from "@/lib/coach"
import { emitXPGain, emitLevelUp } from "@/lib/realtime"
import { redis } from "@/lib/redis"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users with CF handles that need syncing
    const users = await prisma.user.findMany({
      where: {
        cfHandle: { not: null },
        cfSynced: true,
      },
      select: {
        id: true,
        cfHandle: true,
        cfLastSync: true,
        level: true,
      },
    })

    let synced = 0
    let errors = 0

    for (const user of users) {
      if (!user.cfHandle) continue

      try {
        // Fetch recent submissions (last 100)
        const submissions = await getCFSubmissions(user.cfHandle, 1, 100)

        for (const sub of submissions) {
          // Skip if before last sync
          const subDate = new Date(sub.creationTimeSeconds * 1000)
          if (user.cfLastSync && subDate <= user.cfLastSync) continue
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

          // Upsert submission
          const existing = await prisma.submission.findUnique({
            where: { cfSubmissionId: String(sub.id) },
          })
          if (existing) continue

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
          })

          // If AC, award XP and trigger downstream
          if (sub.verdict === "OK") {
            const tagIds = problem.tags.map((t) => t.tagId)
            const waCount = await getWACountBeforeAC(user.id, problem.id)
            const isClean = waCount === 0
            const weakTag = await isWeakTag(user.id, tagIds)
            const xp = calculateXP(sub.problem.rating, user.level, isClean, weakTag)

            const { xpAwarded, newLevel, leveledUp } = await awardXP(
              user.id,
              xp,
              "solve"
            )

            // Update submission XP
            await prisma.submission.updateMany({
              where: { cfSubmissionId: String(sub.id) },
              data: { xpAwarded },
            })

            // Emit realtime events
            await emitXPGain(user.id, xpAwarded, "solve")
            if (leveledUp) {
              await emitLevelUp(user.id, newLevel)
            }

            // Recompute topic scores
            for (const tagId of tagIds) {
              await recomputeTopicScore(user.id, tagId)
            }

            // Update Redis leaderboard
            const currentUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { xp: true },
            })
            if (currentUser) {
              await redis.zadd("leaderboard:global", {
                score: currentUser.xp,
                member: user.id,
              })
            }
          }
        }

        // Recalculate streak
        await recalculateStreak(user.id)

        // Run coach insights
        await generateCoachInsights(user.id)

        // Update sync timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { cfLastSync: new Date() },
        })

        synced++
      } catch (err) {
        console.error(`CF sync error for user ${user.id}:`, err)
        errors++
      }
    }

    return Response.json({
      message: `Synced ${synced} users, ${errors} errors`,
      synced,
      errors,
    })
  } catch (error) {
    console.error("POST /api/cron/cf-sync error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function recalculateStreak(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Check if user solved today
  const solvedToday = await prisma.submission.findFirst({
    where: {
      userId,
      verdict: "OK",
      submittedAt: { gte: today },
    },
  })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakCurrent: true, streakLongest: true, streakLastDay: true },
  })

  if (!user) return

  if (solvedToday) {
    const lastDay = user.streakLastDay ? new Date(user.streakLastDay) : null
    let newStreak = user.streakCurrent

    if (!lastDay || lastDay < yesterday) {
      // Streak was broken or first day
      newStreak = 1
    } else if (lastDay >= yesterday && lastDay < today) {
      // Continuing streak
      newStreak = user.streakCurrent + 1
    }
    // else: already counted today

    await prisma.user.update({
      where: { id: userId },
      data: {
        streakCurrent: newStreak,
        streakLongest: Math.max(user.streakLongest, newStreak),
        streakLastDay: new Date(),
      },
    })

    // Cache streak status
    await redis.setex(`streak:${userId}`, 90000, "1") // 25 hours
  }
}
