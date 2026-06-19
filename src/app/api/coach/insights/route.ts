import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const insights = await prisma.coachInsight.findMany({
      where: {
        userId: session.user.id,
        isRead: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return Response.json({ insights })
  } catch (error) {
    console.error("GET /api/coach/insights error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body as { id: string }

    if (!id) {
      return Response.json({ error: "Insight ID required" }, { status: 400 })
    }

    const insight = await prisma.coachInsight.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!insight) {
      return Response.json({ error: "Insight not found" }, { status: 404 })
    }

    await prisma.coachInsight.update({
      where: { id },
      data: { isRead: true },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/coach/insights error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
