import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
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
        player1: { select: { name: true, cfHandle: true } },
        player2: { select: { name: true, cfHandle: true } },
      },
    })

    if (!duel) {
      return Response.json({ error: "Duel not found" }, { status: 404 })
    }

    // Only player1 (the challenger) can cancel
    if (duel.player1Id !== session.user.id) {
      return Response.json({ error: "Only the challenger can cancel a duel" }, { status: 403 })
    }

    if (duel.status !== "pending") {
      return Response.json({ error: "Only pending duels can be cancelled" }, { status: 400 })
    }

    // Update duel status to cancelled
    await prisma.duel.update({
      where: { id },
      data: { status: "cancelled" },
    })

    // Notify player2 that the duel was cancelled
    const challengerName = duel.player1.name || duel.player1.cfHandle || "Opponent"
    await prisma.notification.create({
      data: {
        userId: duel.player2Id,
        type: "duel_cancelled",
        title: "Duel Cancelled",
        message: `${challengerName} cancelled the duel challenge.`,
        data: { duelId: id },
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/duels/[id]/cancel error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
