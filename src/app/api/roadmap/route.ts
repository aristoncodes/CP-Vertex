import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { generateAIRoadmap } from "@/lib/intelligence"

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
        reasoning: roadmap.reasoning,
        generatedAt: roadmap.generatedAt,
        weeks: roadmap.weeks.map((w) => ({
          weekNumber: w.weekNumber,
          tag: tagMap.get(w.tagId)?.name ?? "unknown",
          targetCount: w.targetCount,
          minRating: w.minRating,
          maxRating: w.maxRating,
          progress: w.progress,
          why: w.why,
          subtopics: w.subtopics,
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

    const result = await generateAIRoadmap(session.user.id)

    if (!result) {
      return Response.json(
        { error: "Failed to generate roadmap. Make sure you have topic scores (sync CF data first)." },
        { status: 400 }
      )
    }

    // Enrich with tag names
    const tagIds = result.weeks.map((w: any) => w.tagId)
    const tags = await prisma.tag.findMany({
      where: { id: { in: tagIds } },
    })
    const tagMap = new Map(tags.map((t) => [t.id, t]))

    return Response.json({
      message: "AI Roadmap generated",
      roadmap: {
        id: result.id,
        reasoning: result.reasoning,
        generatedAt: result.generatedAt,
        weeks: result.weeks.map((w: any) => ({
          weekNumber: w.weekNumber,
          tag: tagMap.get(w.tagId)?.name ?? "unknown",
          targetCount: w.targetCount,
          minRating: w.minRating,
          maxRating: w.maxRating,
          progress: w.progress,
          why: w.why,
          subtopics: w.subtopics,
          progressPercent: Math.round((w.progress / w.targetCount) * 100),
        })),
      },
    })
  } catch (error) {
    console.error("POST /api/roadmap error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

