import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"


export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]
    const cacheKey = `boss:${session.user.id}:${today}`

    // Check if boss already assigned today
    const cachedBossId = await redis.get(cacheKey)
    if (cachedBossId) {
      const problem = await prisma.problem.findUnique({
        where: { id: cachedBossId as string },
        include: { tags: { include: { tag: true } } },
      })
      if (problem) {
        return Response.json({
          id: problem.id,
          cfId: problem.cfId,
          cfLink: problem.cfLink,
          title: problem.title,
          rating: problem.rating,
          tags: problem.tags.map((pt) => pt.tag.name),
        })
      }
    }

    // Get user rating and pick boss around +500
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfRating: true },
    })
    const userRating = user?.cfRating || 800
    const minBoss = userRating + 400
    const maxBoss = userRating + 600

    // Get solved problem IDs to exclude
    const solvedIds = await prisma.submission.findMany({
      where: { userId: session.user.id, verdict: "OK" },
      select: { problemId: true },
      distinct: ["problemId"],
    })
    const solvedSet = new Set(solvedIds.map((s) => s.problemId))

    const candidates = await prisma.problem.findMany({
      where: {
        rating: { gte: minBoss, lte: maxBoss },
        id: { notIn: Array.from(solvedSet) },
      },
      include: { tags: { include: { tag: true } } },
      take: 20,
    })

    if (candidates.length === 0) {
      return Response.json({ error: "No boss problem available" }, { status: 404 })
    }

    // Pick a deterministic daily boss using date-based seed
    const dateHash = today.split("-").reduce((acc, v) => acc + parseInt(v), 0)
    const boss = candidates[(dateHash + session.user.id.length) % candidates.length]

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, boss.id)

    return Response.json({
      id: boss.id,
      cfId: boss.cfId,
      cfLink: boss.cfLink,
      title: boss.title,
      rating: boss.rating,
      tags: boss.tags.map((pt) => pt.tag.name),
    })
  } catch (error) {
    console.error("GET /api/problems/boss error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
