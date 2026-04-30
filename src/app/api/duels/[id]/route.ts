import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const AUTO_CANCEL_MS = 2 * 60 * 1000 // 2 minutes

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

    let duel = await prisma.duel.findUnique({
      where: { id },
      include: {
        player1: { select: { id: true, name: true, cfHandle: true } },
        player2: { select: { id: true, name: true, cfHandle: true } },
      },
    })

    if (!duel) {
      return Response.json({ error: "Duel not found" }, { status: 404 })
    }

    // Auto-cancel pending duels older than 2 minutes
    if (duel.status === "pending") {
      const elapsed = Date.now() - new Date(duel.startedAt).getTime()
      if (elapsed > AUTO_CANCEL_MS) {
        duel = await prisma.duel.update({
          where: { id },
          data: { status: "expired" },
          include: {
            player1: { select: { id: true, name: true, cfHandle: true } },
            player2: { select: { id: true, name: true, cfHandle: true } },
          },
        })

        // Notify both players
        const challengerName = duel.player1.name || duel.player1.cfHandle || "Opponent"
        await prisma.notification.createMany({
          data: [
            {
              userId: duel.player1Id,
              type: "duel_expired",
              title: "Duel Expired",
              message: `Your duel challenge expired — opponent didn't respond in time.`,
              data: { duelId: id },
            },
            {
              userId: duel.player2Id,
              type: "duel_expired",
              title: "Duel Expired",
              message: `Duel from ${challengerName} expired — not accepted within 2 minutes.`,
              data: { duelId: id },
            },
          ],
        })
      }
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
        startedAt: duel.startedAt,
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

