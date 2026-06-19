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
      select: { cfRating: true },
    })
    const userRating = user?.cfRating || 800

    // Target: exactly user_rating + 500
    const targetRating = userRating + 500
    const minRating = targetRating - 100
    const maxRating = targetRating + 100
    console.log(`[PICK API] userRating: ${userRating}, target: ${targetRating}, min: ${minRating}, max: ${maxRating}`);

    // Get solved problem IDs to exclude
    const solvedIds = await prisma.submission.findMany({
      where: { userId: session.user.id, verdict: "OK" },
      select: { problemId: true },
      distinct: ["problemId"],
    })
    const solvedSet = new Set(solvedIds.map(s => s.problemId))

    // Find candidate problems
    const candidates = await prisma.problem.findMany({
      where: {
        rating: { gte: minRating, lte: maxRating },
        id: { notIn: Array.from(solvedSet) },
      },
      include: { tags: { include: { tag: true } } },
      take: 50,
    })

    if (candidates.length === 0) {
      return Response.json({ error: "No suitable problems found at your target range" }, { status: 404 })
    }

    // Pick a random one
    const pick = candidates[Math.floor(Math.random() * candidates.length)]

    // Return WITHOUT rating (user shouldn't see it)
    return Response.json({
      id: pick.id,
      cfId: pick.cfId,
      cfLink: pick.cfLink,
      title: pick.title,
      tags: pick.tags.map(pt => pt.tag.name),
      solvedCount: pick.solvedCount,
      // rating intentionally omitted
    })
  } catch (error) {
    console.error("GET /api/problems/pick error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
