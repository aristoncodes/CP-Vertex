import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const duel = await prisma.duel.findUnique({
      where: { id },
      include: {
        player1: { select: { id: true, name: true, cfHandle: true } },
        player2: { select: { id: true, name: true, cfHandle: true } },
      },
    })

    if (!duel) {
      return Response.json({ error: "Duel not found" }, { status: 404 })
    }

    const problems = await prisma.problem.findMany({
      where: { id: { in: duel.problemIds } },
      select: { id: true, title: true, rating: true, cfLink: true },
    })
    
    // Sort problems to match the order in problemIds
    const sortedProblems = duel.problemIds.map(id => problems.find(p => p.id === id)).filter(Boolean)

    return Response.json({
      duel: {
        id: duel.id,
        status: duel.status,
        problemIds: duel.problemIds,
        questionCount: duel.questionCount,
        endsAt: duel.endsAt,
        player1: duel.player1,
        player2: duel.player2,
        problems: sortedProblems,
        p1WaCount: duel.p1WaCount,
        p2WaCount: duel.p2WaCount,
        p1Progress: duel.p1Progress,
        p2Progress: duel.p2Progress,
        winnerId: duel.winnerId,
        player1Id: duel.player1Id,
        player2Id: duel.player2Id,
      },
    })
  } catch (error) {
    console.error("GET /api/duels/[id] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
