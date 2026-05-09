import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

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

    // Pick one problem per rating tier for gradual difficulty increase
    const targetCount = Math.min(6, Math.max(5, problems.length))
    const minRating = userRating
    const maxRating = userRating + 600
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

    // If tiers didn't fill enough, backfill from remaining
    if (selected.length < targetCount) {
      const remaining = problems.filter((p) => !selected.includes(p))
        .sort(() => Math.random() - 0.5)
      while (selected.length < targetCount && remaining.length > 0) {
        selected.push(remaining.shift()!)
      }
    }

    selected.sort((a, b) => a.rating - b.rating)

    // Fix #5: Store session start time for idempotent verification.
    const sessionStartKey = `session:start:arena:${session.user.id}`
    await redis.setex(sessionStartKey, 14400, String(Date.now())) // 4 hour TTL

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
      sessionStartedAt: Date.now(),
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
