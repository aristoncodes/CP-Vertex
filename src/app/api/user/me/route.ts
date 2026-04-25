import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        cfHandle: true,
        cfRating: true,
        cfSynced: true,
        cfLastSync: true,
        cfVerified: true,
        xp: true,
        level: true,
        streakCurrent: true,
        streakLongest: true,
        streakLastDay: true,
        streakFreezes: true,
        createdAt: true,
        _count: {
          select: {
            badges: true,
            submissions: true,
            postMortems: true,
          },
        },
      },
    })

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    return Response.json(user)
  } catch (error) {
    console.error("GET /api/user/me error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
