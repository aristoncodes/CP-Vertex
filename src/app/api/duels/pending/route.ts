import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const duels = await prisma.duel.findMany({
      where: {
        player2Id: session.user.id,
        status: "pending",
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    })

    // Enrich with player1 info
    const player1Ids = duels.map((d) => d.player1Id)
    const players = await prisma.user.findMany({
      where: { id: { in: player1Ids } },
      select: { id: true, name: true, image: true, cfHandle: true, cfRating: true },
    })
    const playerMap = new Map(players.map((p) => [p.id, p]))

    return Response.json({
      duels: duels.map((d) => ({
        id: d.id,
        challenger: playerMap.get(d.player1Id),
        problemId: d.problemId,
        status: d.status,
        startedAt: d.startedAt,
        endsAt: d.endsAt,
      })),
    })
  } catch (error) {
    console.error("GET /api/duels/pending error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
