import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"


import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// DELETE /api/friends/[userId] — unfriend or cancel pending request
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const myId = session.user.id
  const { userId: theirId } = await params

  const deleted = await prisma.friendship.deleteMany({
    where: {
      OR: [
        { senderId: myId, receiverId: theirId },
        { senderId: theirId, receiverId: myId },
      ],
    },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Friendship not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
