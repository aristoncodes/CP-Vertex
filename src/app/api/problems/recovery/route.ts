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

    // Pick one problem per rating tier for gradual difficulty increase
    const targetCount = Math.min(3, easyProblems.length)
    const minRating = 800
    const maxRating = userRating + 100
    const tierSize = (maxRating - minRating) / targetCount
    const selected: typeof easyProblems = []

    for (let i = 0; i < targetCount; i++) {
      const tierMin = minRating + Math.floor(i * tierSize)
      const tierMax = minRating + Math.floor((i + 1) * tierSize)
      const tierCandidates = easyProblems.filter(
        (p) => p.rating >= tierMin && p.rating <= tierMax && !selected.includes(p)
      )
      if (tierCandidates.length > 0) {
        selected.push(tierCandidates[Math.floor(Math.random() * tierCandidates.length)])
      }
    }

    // Backfill if tiers didn't fill enough
    if (selected.length < targetCount) {
      const remaining = easyProblems.filter((p) => !selected.includes(p))
        .sort(() => Math.random() - 0.5)
      while (selected.length < targetCount && remaining.length > 0) {
        selected.push(remaining.shift()!)
      }
    }

    selected.sort((a, b) => a.rating - b.rating)

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
