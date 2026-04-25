import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Arena mode: 5-8 problems targeting top 2 weak tags
    const weakTags = await prisma.topicScore.findMany({
      where: { userId: session.user.id },
      orderBy: { score: "asc" },
      take: 2,
      include: { tag: true },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfRating: true },
    })
    const userRating = user?.cfRating || 800

    // Get solved problem IDs
    const solvedIds = await prisma.submission.findMany({
      where: { userId: session.user.id, verdict: "OK" },
      select: { problemId: true },
      distinct: ["problemId"],
    })
    const solvedSet = new Set(solvedIds.map((s) => s.problemId))

    const weakTagIds = weakTags.map((t) => t.tagId)

    const problems = await prisma.problem.findMany({
      where: {
        ...(weakTagIds.length > 0
          ? { tags: { some: { tagId: { in: weakTagIds } } } }
          : {}),
        rating: {
          gte: userRating,
          lte: userRating + 600,
        },
        id: { notIn: Array.from(solvedSet) },
      },
      include: { tags: { include: { tag: true } } },
      take: 30,
    })

    // Randomly select 5-6
    const shuffled = problems.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(6, Math.max(5, shuffled.length)))

    return Response.json({
      problems: selected.map((p) => ({
        id: p.id,
        cfId: p.cfId,
        cfLink: p.cfLink,
        title: p.title,
        rating: p.rating,
        tags: p.tags.map((pt) => pt.tag.name),
      })),
      mode: "arena",
      targetTags: weakTags.map((t) => ({
        name: t.tag.name,
        score: t.score,
      })),
    })
  } catch (error) {
    console.error("GET /api/problems/arena error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
