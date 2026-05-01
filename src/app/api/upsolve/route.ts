import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ratelimit } from "@/lib/ratelimit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || "pending"
  const category = searchParams.get("category") || undefined
  const division = searchParams.get("division") ? Number(searchParams.get("division")) : undefined

  const where: Record<string, unknown> = {
    userId: session.user.id,
    status,
  }
  if (category) where.category = category
  if (division) where.contestParticipation = { division }

  const items = await prisma.upsolveItem.findMany({
    where,
    orderBy: [
      { priority: "asc" },
      { deadlineAt: "asc" },
    ],
    include: {
      problem: { include: { tags: { include: { tag: true } } } },
      contestParticipation: true,
    },
  })

  return NextResponse.json({ items })
}
