import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const q = request.nextUrl.searchParams.get("q")
    if (!q || q.length < 2) {
      return Response.json({ error: "Query too short" }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } },
          {
            OR: [
              { cfHandle: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        cfHandle: true,
        cfRating: true,
        level: true,
        xp: true,
        image: true,
      },
      take: 10,
    })

    return Response.json({ users })
  } catch (error) {
    console.error("GET /api/user/search error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
