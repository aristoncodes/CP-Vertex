import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const scores = await prisma.topicScore.findMany({
      where: { userId: session.user.id },
      include: { tag: true },
      orderBy: { score: "desc" },
    })

    return Response.json({
      scores: scores.map((s) => ({
        tag: s.tag.name,
        category: s.tag.category,
        score: s.score,
        trend: s.trend,
        acCount: s.acCount,
        totalAttempts: s.totalAttempts,
        lastUpdated: s.lastUpdated,
      })),
    })
  } catch (error) {
    console.error("GET /api/analytics/scores error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
