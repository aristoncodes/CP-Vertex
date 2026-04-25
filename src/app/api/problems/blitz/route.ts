import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Blitz mode: 3-5 comfort zone problems (at or slightly below user level)
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

    // Blitz mode target = rating + 200 to rating + 400
    const problems = await prisma.problem.findMany({
      where: {
        rating: {
          gte: userRating + 200,
          lte: userRating + 400,
        },
        id: { notIn: Array.from(solvedSet) },
      },
      include: { tags: { include: { tag: true } } },
      take: 20,
    })

    // Randomly pick 3-4
    const shuffled = problems.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(4, Math.max(3, shuffled.length)))

    return Response.json({
      problems: selected.map((p) => ({
        id: p.id,
        cfId: p.cfId,
        cfLink: p.cfLink,
        title: p.title,
        rating: p.rating,
        tags: p.tags.map((pt) => pt.tag.name),
      })),
      mode: "blitz",
    })
  } catch (error) {
    console.error("GET /api/problems/blitz error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
