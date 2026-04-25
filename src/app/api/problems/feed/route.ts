import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's weakest tags (lowest scores)
    const weakTags = await prisma.topicScore.findMany({
      where: { userId: session.user.id },
      orderBy: { score: "asc" },
      take: 3,
      include: { tag: true },
    })

    // Get user's average rating
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfRating: true },
    })
    const userRating = user?.cfRating || 800

    // Get solved problem IDs to exclude
    const solvedIds = await prisma.submission.findMany({
      where: { userId: session.user.id, verdict: "OK" },
      select: { problemId: true },
      distinct: ["problemId"],
    })
    const solvedSet = new Set(solvedIds.map((s) => s.problemId))

    // Build personalized feed: weak tags at user's level
    const weakTagIds = weakTags.map((t) => t.tagId)

    const problems = await prisma.problem.findMany({
      where: {
        ...(weakTagIds.length > 0
          ? { tags: { some: { tagId: { in: weakTagIds } } } }
          : {}),
        rating: {
          gte: Math.max(800, userRating - 200),
          lte: userRating + 300,
        },
        id: { notIn: Array.from(solvedSet) },
      },
      include: { tags: { include: { tag: true } } },
      orderBy: { rating: "asc" },
      take: 20,
    })

    return Response.json({
      problems: problems.map((p) => ({
        id: p.id,
        cfId: p.cfId,
        cfLink: p.cfLink,
        title: p.title,
        rating: p.rating,
        solvedCount: p.solvedCount,
        tags: p.tags.map((pt) => pt.tag.name),
        isWeakTag: p.tags.some((pt) => weakTagIds.includes(pt.tagId)),
      })),
      weakTags: weakTags.map((t) => ({
        name: t.tag.name,
        score: t.score,
      })),
    })
  } catch (error) {
    console.error("GET /api/problems/feed error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
