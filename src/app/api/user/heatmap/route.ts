import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build 90-day heatmap from submissions
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const submissions = await prisma.submission.findMany({
      where: {
        userId: session.user.id,
        verdict: "OK",
        submittedAt: { gte: ninetyDaysAgo },
      },
      select: { submittedAt: true },
      orderBy: { submittedAt: "asc" },
    })

    // Group by date
    const heatmap: Record<string, number> = {}
    for (const sub of submissions) {
      const dateKey = sub.submittedAt.toISOString().split("T")[0]
      heatmap[dateKey] = (heatmap[dateKey] || 0) + 1
    }

    // Convert to array format
    const data = Object.entries(heatmap).map(([date, count]) => ({
      date,
      count,
    }))

    return Response.json({ data, totalDays: 90 })
  } catch (error) {
    console.error("GET /api/user/heatmap error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
