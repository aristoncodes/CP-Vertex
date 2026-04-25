import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        cfHandle: true,
        cfRating: true,
        xp: true,
        level: true,
        streakCurrent: true,
        streakLongest: true,
      },
    })

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Total solved
    const totalSolved = await prisma.submission.count({
      where: { userId: session.user.id, verdict: "OK" },
    })

    // XP history (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSubs = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
        verdict: "OK",
        submittedAt: { gte: thirtyDaysAgo },
      },
      select: { xpAwarded: true, submittedAt: true },
      orderBy: { submittedAt: "asc" },
    })

    // Group XP by date
    const xpHistory: Record<string, number> = {}
    for (const sub of recentSubs) {
      const dateKey = sub.submittedAt.toISOString().split("T")[0]
      xpHistory[dateKey] = (xpHistory[dateKey] || 0) + sub.xpAwarded
    }

    return Response.json({
      cfHandle: user.cfHandle,
      cfRating: user.cfRating,
      totalSolved,
      xp: user.xp,
      level: user.level,
      streakCurrent: user.streakCurrent,
      streakLongest: user.streakLongest,
      xpHistory: Object.entries(xpHistory).map(([date, xp]) => ({ date, xp })),
    })
  } catch (error) {
    console.error("GET /api/user/stats error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
