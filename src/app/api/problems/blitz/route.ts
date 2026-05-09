import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

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

    // Pick one problem per rating tier for gradual difficulty increase
    const targetCount = Math.min(4, Math.max(3, problems.length))
    const minRating = userRating + 200
    const maxRating = userRating + 400
    const tierSize = (maxRating - minRating) / targetCount
    const selected: typeof problems = []

    for (let i = 0; i < targetCount; i++) {
      const tierMin = minRating + Math.floor(i * tierSize)
      const tierMax = minRating + Math.floor((i + 1) * tierSize)
      const tierCandidates = problems.filter(
        (p) => p.rating >= tierMin && p.rating <= tierMax && !selected.includes(p)
      )
      if (tierCandidates.length > 0) {
        selected.push(tierCandidates[Math.floor(Math.random() * tierCandidates.length)])
      }
    }

    // If tiers didn't fill enough, backfill from remaining unsolved problems
    if (selected.length < targetCount) {
      const remaining = problems.filter((p) => !selected.includes(p))
        .sort(() => Math.random() - 0.5)
      while (selected.length < targetCount && remaining.length > 0) {
        selected.push(remaining.shift()!)
      }
    }

    selected.sort((a, b) => a.rating - b.rating)

    // Fix #5: Store session start time for idempotent verification.
    // Any verify call will check that CF submissions were made AFTER this timestamp.
    const sessionStartKey = `session:start:blitz:${session.user.id}`
    await redis.setex(sessionStartKey, 7200, String(Date.now())) // 2 hour TTL

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
      sessionStartedAt: Date.now(),
    })
  } catch (error) {
    console.error("GET /api/problems/blitz error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
