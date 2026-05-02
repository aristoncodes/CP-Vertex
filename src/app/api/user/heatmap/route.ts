import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build full-year heatmap from submissions (365 days to match the component grid)
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)

    const submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
        verdict: "OK",
        submittedAt: { gte: oneYearAgo },
      },
      select: { submittedAt: true, xpAwarded: true },
      orderBy: { submittedAt: "asc" },
    })

    // Group by date
    const heatmap: Record<string, { count: number; xpCount: number }> = {}
    for (const sub of submissions) {
      const dateKey = sub.submittedAt.toISOString().split("T")[0]
      if (!heatmap[dateKey]) heatmap[dateKey] = { count: 0, xpCount: 0 }
      heatmap[dateKey].count += 1
      if (sub.xpAwarded > 0) heatmap[dateKey].xpCount += 1
    }

    // Convert to array format
    const data = Object.entries(heatmap).map(([date, { count, xpCount }]) => ({
      date,
      count,
      xpCount,
    }))

    return Response.json({ data, totalDays: 365 })
  } catch (error) {
    console.error("GET /api/user/heatmap error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
