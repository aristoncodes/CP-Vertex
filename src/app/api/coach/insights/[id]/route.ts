import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

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
    console.error("PATCH /api/coach/insights/[id] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
