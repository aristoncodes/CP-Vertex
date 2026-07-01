import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const rawStatus = searchParams.get("status") || "pending"
  const category = searchParams.get("category") || undefined
  const division = searchParams.get("division") ? Number(searchParams.get("division")) : undefined

  const where: Record<string, unknown> = {
    userId: session.user.id,
    // "Graveyard" is no longer a separate bucket — treat past-deadline items
    // as part of the same list, so nothing gets stranded when the expiry job
    // doesn't run.
    status: rawStatus === "pending" ? { in: ["pending", "graveyard"] } : rawStatus,
  }
  if (category) where.category = category
  if (division) where.contestParticipation = { division }

  const items = await prisma.upsolveItem.findMany({
    where,
    // Most recent upsolves on top, oldest at the bottom.
    orderBy: [{ createdAt: "desc" }],
    include: {
      problem: { include: { tags: { include: { tag: true } } } },
      contestParticipation: true,
    },
  })

  return NextResponse.json({ items })
}
