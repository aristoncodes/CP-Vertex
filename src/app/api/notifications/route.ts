import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: 30,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    })

    return Response.json({ notifications, unreadCount })
  } catch (error) {
    console.error("GET /api/notifications error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

const markReadSchema = z.union([
  z.object({ ids: z.array(z.string().min(1)) }),
  z.object({ all: z.literal(true) }),
])

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = markReadSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 })
    }

    const data = parsed.data

    if ("all" in data && data.all) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      })
    } else if ("ids" in data) {
      await prisma.notification.updateMany({
        where: {
          id: { in: data.ids },
          userId: session.user.id,
        },
        data: { isRead: true },
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("PATCH /api/notifications error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
