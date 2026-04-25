import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeen: new Date() },
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error("POST /api/user/heartbeat error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
