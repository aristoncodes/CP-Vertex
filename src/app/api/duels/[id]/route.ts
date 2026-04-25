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
        problem: { select: { id: true, title: true, rating: true, cfLink: true } },
      },
    })

    if (!duel) {
      return Response.json({ error: "Duel not found" }, { status: 404 })
    }

    // Optional: Only allow participants to view the duel
    // if (duel.player1Id !== session.user.id && duel.player2Id !== session.user.id) {
    //   return Response.json({ error: "Forbidden" }, { status: 403 })
    // }

    return Response.json({
      duel: {
        id: duel.id,
        status: duel.status,
        problemId: duel.problemId,
        endsAt: duel.endsAt,
        player1: duel.player1,
        player2: duel.player2,
        problem: duel.problem,
        p1WaCount: duel.p1WaCount,
        p2WaCount: duel.p2WaCount,
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
