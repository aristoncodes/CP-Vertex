import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  // Count pending target items
  const pendingCount = await prisma.upsolveItem.count({
    where: { userId, status: "pending", category: "target" },
  })

  // Count expiring in <24h
  const expiringCount = await prisma.upsolveItem.count({
    where: {
      userId,
      status: "pending",
      category: "target",
      deadlineAt: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    },
  })

  // Top 4 items for widget
  const items = await prisma.upsolveItem.findMany({
    where: { userId, status: "pending", category: "target" },
    orderBy: [{ priority: "asc" }, { deadlineAt: "asc" }],
    take: 4,
    include: {
      problem: { include: { tags: { include: { tag: true } } } },
      contestParticipation: true,
    },
  })

  // Total XP waiting (rough calculation)
  const totalXP = items.reduce(
    (sum, item) =>
      sum + Math.floor((item.problem.rating || 1000) * item.xpMultiplier),
    0
  )

  return NextResponse.json({
    pendingCount,
    expiringCount,
    totalXP,
    items,
  })
}
