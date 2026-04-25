import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all tags with their submission verdicts for this user
    const tags = await prisma.tag.findMany({
      include: {
        problems: {
          include: {
            problem: {
              include: {
                submissions: {
                  where: { userId: session.user.id },
                  select: { verdict: true },
                },
              },
            },
          },
        },
      },
    })

    const mistakes = tags
      .map((tag) => {
        const allSubs = tag.problems.flatMap((pt) => pt.problem.submissions)
        if (allSubs.length === 0) return null

        const wa = allSubs.filter((s) => s.verdict === "WRONG_ANSWER").length
        const tle = allSubs.filter((s) => s.verdict === "TIME_LIMIT_EXCEEDED").length
        const re = allSubs.filter((s) => s.verdict === "RUNTIME_ERROR").length
        const mle = allSubs.filter((s) => s.verdict === "MEMORY_LIMIT_EXCEEDED").length
        const ac = allSubs.filter((s) => s.verdict === "OK").length
        const total = allSubs.length

        return {
          tag: tag.name,
          category: tag.category,
          total,
          ac,
          wa,
          tle,
          re,
          mle,
          failureRate: total > 0 ? Math.round(((total - ac) / total) * 100) : 0,
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b?.failureRate ?? 0) - (a?.failureRate ?? 0))

    return Response.json({ mistakes })
  } catch (error) {
    console.error("GET /api/analytics/mistakes error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
