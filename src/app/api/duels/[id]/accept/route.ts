import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const duel = await prisma.duel.findUnique({ where: { id } })
    if (!duel) {
      return Response.json({ error: "Duel not found" }, { status: 404 })
    }

    if (duel.player2Id !== session.user.id) {
      return Response.json({ error: "Only the challenged player can accept" }, { status: 403 })
    }

    if (duel.status !== "pending") {
      return Response.json({ error: "Duel is not pending" }, { status: 400 })
    }

    const updated = await prisma.duel.update({
      where: { id },
      data: { status: "active" },
    })

    // Notify player1 that their challenge was accepted
    const accepter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, cfHandle: true },
    })
    const accepterName = accepter?.name || accepter?.cfHandle || "Opponent"
    await prisma.notification.create({
      data: {
        userId: duel.player1Id,
        type: "duel_accepted",
        title: "Challenge Accepted!",
        message: `${accepterName} accepted your duel challenge. Game on!`,
        data: { duelId: id },
      },
    })

    return Response.json({ duel: updated })
  } catch (error) {
    console.error("PATCH /api/duels/[id]/accept error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
