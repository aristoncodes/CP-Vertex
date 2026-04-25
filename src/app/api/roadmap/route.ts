import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const roadmap = await prisma.roadmap.findUnique({
      where: { userId: session.user.id },
      include: {
        weeks: {
          orderBy: { weekNumber: "asc" },
        },
      },
    })

    if (!roadmap) {
      return Response.json({ roadmap: null, message: "No roadmap generated yet" })
    }

    // Enrich weeks with tag names
    const tagIds = roadmap.weeks.map((w) => w.tagId)
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    })
    const tagMap = new Map(tags.map((t) => [t.id, t]))

    return Response.json({
      roadmap: {
        id: roadmap.id,
        generatedAt: roadmap.generatedAt,
        weeks: roadmap.weeks.map((w) => ({
          weekNumber: w.weekNumber,
          tag: tagMap.get(w.tagId)?.name ?? "unknown",
          targetCount: w.targetCount,
          minRating: w.minRating,
          maxRating: w.maxRating,
          progress: w.progress,
          progressPercent: Math.round((w.progress / w.targetCount) * 100),
        })),
      },
    })
  } catch (error) {
    console.error("GET /api/roadmap error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.api, session.user.id)
    if (rateLimited) return rateLimited

    // Get user's weakest tags
    const weakTags = await prisma.topicScore.findMany({
      where: { userId: session.user.id },
      orderBy: { score: "asc" },
      take: 4,
      include: { tag: true },
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfRating: true },
    })
    const userRating = user?.cfRating || 800

    // Delete existing roadmap
    const existing = await prisma.roadmap.findUnique({
      where: { userId: session.user.id },
    })
    if (existing) {
      await prisma.roadmapWeek.deleteMany({ where: { roadmapId: existing.id } })
      await prisma.roadmap.delete({ where: { id: existing.id } })
    }

    // Generate 4-week roadmap targeting weak tags
    const roadmap = await prisma.roadmap.create({
      data: {
        userId: session.user.id,
        weeks: {
          create: weakTags.map((tag, i) => ({
            weekNumber: i + 1,
            tagId: tag.tagId,
            targetCount: 5 + i, // increasing difficulty
            minRating: Math.max(800, userRating - 100),
            maxRating: userRating + 200 + i * 100,
          })),
        },
      },
      include: { weeks: true },
    })

    return Response.json({
      message: "Roadmap generated",
      roadmap: {
        id: roadmap.id,
        generatedAt: roadmap.generatedAt,
        weeks: roadmap.weeks.map((w) => ({
          weekNumber: w.weekNumber,
          tagId: w.tagId,
          targetCount: w.targetCount,
          minRating: w.minRating,
          maxRating: w.maxRating,
          progress: w.progress,
        })),
      },
    })
  } catch (error) {
    console.error("POST /api/roadmap error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
