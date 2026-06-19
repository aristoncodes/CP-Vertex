import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET /api/friends — list all accepted friends
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      sender:   { select: { id: true, name: true, cfHandle: true, cfRating: true, xp: true, level: true, streakCurrent: true, image: true, lastSeen: true } },
      receiver: { select: { id: true, name: true, cfHandle: true, cfRating: true, xp: true, level: true, streakCurrent: true, image: true, lastSeen: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const friends = friendships.map((f) => {
    const friend = f.senderId === userId ? f.receiver : f.sender
    return { ...friend, friendshipId: f.id }
  })

  return NextResponse.json(friends)
}

// POST /api/friends — send a friend request
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { receiverId } = await req.json()
  if (!receiverId) return NextResponse.json({ error: "receiverId required" }, { status: 400 })

  const senderId = session.user.id
  if (senderId === receiverId) return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 })

  // Check if friendship already exists in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  })

  if (existing) {
    return NextResponse.json({ error: "Friendship already exists", status: existing.status }, { status: 409 })
  }

  const friendship = await prisma.friendship.create({
    data: { senderId, receiverId, status: "pending" },
  })

  // Notify the receiver
  const senderUser = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true, cfHandle: true } })
  const senderName = senderUser?.cfHandle || senderUser?.name || "Someone"

  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "friend_request",
      title: "Friend Request",
      message: `${senderName} wants to be friends!`,
      data: { friendshipId: friendship.id, senderId },
    },
  })

  return NextResponse.json({ friendship }, { status: 201 })
}
