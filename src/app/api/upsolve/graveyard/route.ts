import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.upsolveItem.findMany({
    where: { userId: session.user.id, status: "graveyard" },
    orderBy: { deadlineAt: "desc" },
    include: {
      problem: { include: { tags: { include: { tag: true } } } },
      contestParticipation: true,
    },
  })

  return NextResponse.json({ items })
}
