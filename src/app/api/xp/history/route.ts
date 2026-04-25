import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get XP from submissions
    const submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
        verdict: "OK",
        submittedAt: { gte: thirtyDaysAgo },
      },
      select: { xpAwarded: true, submittedAt: true },
      orderBy: { submittedAt: "asc" },
    })

    // Get XP from post-mortems
    const postMortems = await prisma.postMortem.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { xpAwarded: true, createdAt: true },
    })

    // Get XP from missions
    const missions = await prisma.userMission.findMany({
      where: {
        userId: session.user.id,
        completed: true,
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { xpAwarded: true, completedAt: true },
    })

    // Combine and group by date
    const history: Record<string, { solve: number; postmortem: number; mission: number; total: number }> = {}

    for (const sub of submissions) {
      const date = sub.submittedAt.toISOString().split("T")[0]
      if (!history[date]) history[date] = { solve: 0, postmortem: 0, mission: 0, total: 0 }
      history[date].solve += sub.xpAwarded
      history[date].total += sub.xpAwarded
    }

    for (const pm of postMortems) {
      const date = pm.createdAt.toISOString().split("T")[0]
      if (!history[date]) history[date] = { solve: 0, postmortem: 0, mission: 0, total: 0 }
      history[date].postmortem += pm.xpAwarded
      history[date].total += pm.xpAwarded
    }

    for (const m of missions) {
      if (!m.completedAt) continue
      const date = m.completedAt.toISOString().split("T")[0]
      if (!history[date]) history[date] = { solve: 0, postmortem: 0, mission: 0, total: 0 }
      history[date].mission += m.xpAwarded
      history[date].total += m.xpAwarded
    }

    const data = Object.entries(history)
      .map(([date, breakdown]) => ({ date, ...breakdown }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalXP30d = data.reduce((sum, d) => sum + d.total, 0)

    return Response.json({ history: data, totalXP30d })
  } catch (error) {
    console.error("GET /api/xp/history error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
