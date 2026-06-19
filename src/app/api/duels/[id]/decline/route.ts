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

    // Only player2 can decline
    if (duel.player2Id !== session.user.id) {
      return Response.json({ error: "Only the challenged player can decline" }, { status: 403 })
    }

    if (duel.status !== "pending") {
      return Response.json({ error: "Duel is not pending" }, { status: 400 })
    }

    // Update duel status
    await prisma.duel.update({
      where: { id },
      data: { status: "declined" },
    })

    // Notify player1 that the challenge was declined
    const declineName = duel.player2.name || duel.player2.cfHandle || "Opponent"
    await prisma.notification.create({
      data: {
        userId: duel.player1Id,
        type: "duel_declined",
        title: "Duel Declined",
        message: `${declineName} declined your duel challenge.`,
        data: { duelId: id },
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/duels/[id]/decline error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
