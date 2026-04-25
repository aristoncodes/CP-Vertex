import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Users seen in the last 5 minutes are considered online
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const users = await prisma.user.findMany({
      where: {
        lastSeen: { gte: fiveMinutesAgo },
        id: { not: session.user.id }, // exclude self
      },
      select: {
        id: true,
        name: true,
        cfHandle: true,
        cfRating: true,
        level: true,
        image: true,
        xp: true,
      },
      orderBy: { lastSeen: "desc" },
      take: 50,
    })

    return Response.json({ users })
  } catch (error) {
    console.error("GET /api/user/online error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
