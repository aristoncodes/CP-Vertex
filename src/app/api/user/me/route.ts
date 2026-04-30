import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/withAuth"

export const GET = withAuth(async (req, userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
