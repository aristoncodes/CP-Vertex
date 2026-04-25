import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Recovery mode: 3 easy problems + 1 familiar (strong) tag
    const strongTags = await prisma.topicScore.findMany({
      where: { userId: session.user.id },
      orderBy: { score: "desc" },
      take: 1,
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

    // Easy problems: 800 to rating + 100
    const easyProblems = await prisma.problem.findMany({
      where: {
        rating: {
          gte: 800,
          lte: userRating + 100,
        },
        id: { notIn: Array.from(solvedSet) },
        ...(strongTags.length > 0
          ? { tags: { some: { tagId: strongTags[0].tagId } } }
          : {}),
      },
      include: { tags: { include: { tag: true } } },
      take: 10,
    })

    const shuffled = easyProblems.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(3, shuffled.length))

    return Response.json({
      problems: selected.map((p) => ({
        id: p.id,
        cfId: p.cfId,
        cfLink: p.cfLink,
        title: p.title,
        rating: p.rating,
        tags: p.tags.map((pt) => pt.tag.name),
      })),
      mode: "recovery",
      familiarTag: strongTags[0]?.tag.name ?? null,
    })
  } catch (error) {
    console.error("GET /api/problems/recovery error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
