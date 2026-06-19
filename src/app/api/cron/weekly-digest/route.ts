import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all users
    const users = await prisma.user.findMany({
      where: { cfSynced: true },
      select: { id: true, email: true, name: true, streakCurrent: true },
    })

    let processed = 0

    for (const user of users) {
      try {
        const thisWeekStart = getWeekStart(new Date())
        const lastWeekStart = getWeekStart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

        const thisWeekStats = await getWeekStats(user.id, thisWeekStart)
        const lastWeekStats = await getWeekStats(user.id, lastWeekStart)

        // Find best and worst tags
        const topicScores = await prisma.topicScore.findMany({
          where: { userId: user.id },
          include: { tag: true },
          orderBy: { score: "desc" },
        })

        const bestTag = topicScores[0]?.tag.name ?? null
        const worstTag = topicScores[topicScores.length - 1]?.tag.name ?? null

        // Store weekly review
        await prisma.weeklyReview.upsert({
          where: {
            userId_weekStart: {
              userId: user.id,
              weekStart: thisWeekStart,
            },
          },
          create: {
            userId: user.id,
            weekStart: thisWeekStart,
            totalXp: thisWeekStats.xp,
            problemsSolved: thisWeekStats.solved,
            bestTag,
            worstTag,
            streakStatus: user.streakCurrent > 0 ? "alive" : "broken",
            data: {
              thisWeek: thisWeekStats,
              lastWeek: lastWeekStats,
              topicScores: topicScores.map((ts) => ({
                tag: ts.tag.name,
                score: ts.score,
                trend: ts.trend,
              })),
            },
          },
          update: {
            totalXp: thisWeekStats.xp,
            problemsSolved: thisWeekStats.solved,
            bestTag,
            worstTag,
            streakStatus: user.streakCurrent > 0 ? "alive" : "broken",
            data: {
              thisWeek: thisWeekStats,
              lastWeek: lastWeekStats,
            },
          },
        })

        // Email would be sent here via Resend in production
        // await resend.emails.send({ ... })

        processed++
      } catch (err) {
        console.error(`Weekly digest error for user ${user.id}:`, err)
      }
    }

    return Response.json({
      message: `Processed ${processed} weekly digests`,
      processed,
    })
  } catch (error) {
    console.error("POST /api/cron/weekly-digest error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

async function getWeekStats(
  userId: string,
  weekStart: Date
): Promise<{ xp: number; solved: number; submissions: number }> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      submittedAt: { gte: weekStart, lt: weekEnd },
    },
    select: { verdict: true, xpAwarded: true },
  })

  const solved = submissions.filter((s) => s.verdict === "OK").length
  const xp = submissions.reduce((sum, s) => sum + s.xpAwarded, 0)

  return { xp, solved, submissions: submissions.length }
}
