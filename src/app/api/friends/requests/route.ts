import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"


import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET /api/friends/requests — list incoming pending requests
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const requests = await prisma.friendship.findMany({
    where: { receiverId: session.user.id, status: "pending" },
    include: {
      sender: { select: { id: true, name: true, cfHandle: true, cfRating: true, level: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(requests)
}

// PATCH /api/friends/requests — accept or decline a request
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { friendshipId, action } = await req.json()
  if (!friendshipId || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "friendshipId and action ('accept'|'decline') required" }, { status: 400 })
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship || friendship.receiverId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const newStatus = action === "accept" ? "accepted" : "declined"

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: newStatus },
  })

  // Notify the original sender if accepted
  if (action === "accept") {
    const receiverUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, cfHandle: true },
    })
    const receiverName = receiverUser?.cfHandle || receiverUser?.name || "Someone"

    await prisma.notification.create({
      data: {
        userId: friendship.senderId,
        type: "friend_accepted",
        title: "Friend Request Accepted",
        message: `${receiverName} accepted your friend request!`,
        data: { friendshipId: friendship.id },
      },
    })
  }

  return NextResponse.json({ friendship: updated })
}
