import { prisma } from "@/lib/prisma"
import { getCFSubmissions, fetchAllSubmissions } from "@/lib/cf-api"
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

    // ─── Fix #4: Zombie Duel Cleanup ─────────────────────────
    // Expire any active duels whose endsAt timestamp has passed.
    // This runs on every cron tick so duels never sit as "active" forever.
    const expiredDuels = await prisma.duel.updateMany({
      where: {
        status: "active",
        endsAt: { lt: new Date() },
      },
      data: { status: "expired" },
    })
    if (expiredDuels.count > 0) {
      console.log(`[cf-sync] Expired ${expiredDuels.count} zombie duels`)
    }

    // Also expire pending duels older than 2 minutes (no response from opponent)
    const twMinAgo = new Date(Date.now() - 2 * 60 * 1000)
    const expiredPending = await prisma.duel.updateMany({
      where: {
        status: "pending",
        startedAt: { lt: twMinAgo },
      },
      data: { status: "expired" },
    })
    if (expiredPending.count > 0) {
      console.log(`[cf-sync] Expired ${expiredPending.count} stale pending duels`)
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
        // If never synced before, pull ALL submissions for full heatmap + totalSolved
        // Otherwise, pull last 500 (enough for a day's activity)
        const submissions = user.cfLastSync
          ? await getCFSubmissions(user.cfHandle, 1, 500)
          : await fetchAllSubmissions(user.cfHandle)

        for (const sub of submissions) {
          // Skip if before last sync
          const subDate = new Date(sub.creationTimeSeconds * 1000)
          if (user.cfLastSync && subDate <= user.cfLastSync) continue
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
                rating: sub.problem.rating || 0,
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
            const xp = calculateXP(sub.problem.rating || 0, user.level, isClean, weakTag)

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakCurrent: true, streakLongest: true, streakLastDay: true },
  })
  if (!user) return

  // Fetch all OK submissions, ordered newest first
  const allOKSubmissions = await prisma.submission.findMany({
    where: { userId, verdict: "OK" },
    select: { submittedAt: true },
    orderBy: { submittedAt: "desc" },
  })

  if (allOKSubmissions.length === 0) return

  // Helper to convert UTC Date to IST date string (UTC+5:30)
  const getISTDateStr = (date: Date) => {
    const istTime = new Date(date.getTime() + 330 * 60000)
    return istTime.toISOString().split("T")[0]
  }

  // Group by unique date strings (YYYY-MM-DD IST)
  const uniqueDates = Array.from(
    new Set(allOKSubmissions.map(s => getISTDateStr(s.submittedAt)))
  )

  const now = new Date()
  const todayStr = getISTDateStr(now)
  
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60000)
  const yesterdayStr = getISTDateStr(yesterdayDate)

  let currentStreak = 0
  let lastActiveDay: Date | null = null

  // Check if streak is active (solved today or yesterday in IST)
  if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
    let checkDate = uniqueDates.includes(todayStr) ? now : yesterdayDate
    lastActiveDay = new Date(checkDate)
    while (true) {
      const dateStr = getISTDateStr(checkDate)
      if (uniqueDates.includes(dateStr)) {
        currentStreak++
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60000)
      } else {
        break
      }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      streakCurrent: currentStreak,
      streakLongest: Math.max(user.streakLongest, currentStreak),
      ...(lastActiveDay ? { streakLastDay: lastActiveDay } : {}),
    },
  })

  // Cache streak status
  if (currentStreak > 0) {
    await redis.setex(`streak:${userId}`, 90000, "1") // 25 hours
  }
}
