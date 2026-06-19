import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // ── Check if user has an active (engaged) boss ──────────────
    const engagedKey = `boss:engaged:${userId}`
    const engagedBossId = await redis.get(engagedKey)
    if (engagedBossId) {
      const problem = await prisma.problem.findUnique({
        where: { id: engagedBossId as string },
        include: { tags: { include: { tag: true } } },
      })
      if (problem) {
        return Response.json({
          id: problem.id,
          cfId: problem.cfId,
          cfLink: buildCfLink(problem.cfId, problem.cfLink),
          title: problem.title,
          rating: problem.rating,
          tags: problem.tags.map((pt) => pt.tag.name),
          engaged: true, // tell the client this boss is already engaged
        })
      }
    }

    // ── No engaged boss — pick a new random one ─────────────────
    // Get user rating and pick boss around +400 to +600
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cfRating: true },
    })
    const userRating = user?.cfRating || 800
    const minBoss = userRating + 400
    const maxBoss = userRating + 600

    // Get solved problem IDs to exclude
    const solvedIds = await prisma.submission.findMany({
      where: { userId, verdict: "OK" },
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
      take: 50, // fetch more candidates for better randomization
    })

    if (candidates.length === 0) {
      return Response.json({ error: "No boss problem available" }, { status: 404 })
    }

    // Pick a RANDOM boss (different each time you visit, until you engage)
    const boss = candidates[Math.floor(Math.random() * candidates.length)]

    return Response.json({
      id: boss.id,
      cfId: boss.cfId,
      cfLink: buildCfLink(boss.cfId, boss.cfLink),
      title: boss.title,
      rating: boss.rating,
      tags: boss.tags.map((pt) => pt.tag.name),
      engaged: false,
    })
  } catch (error) {
    console.error("GET /api/problems/boss error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Build a valid CF link from cfId (e.g. "1234A") even if cfLink is null
function buildCfLink(cfId: string, storedLink: string | null): string {
  if (storedLink) return storedLink
  const match = cfId.match(/^(\d+)(.+)$/)
  if (match) {
    return `https://codeforces.com/problemset/problem/${match[1]}/${match[2]}`
  }
  return `https://codeforces.com/problemset/problem/${cfId}`
}
