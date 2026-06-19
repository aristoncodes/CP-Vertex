import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFRatingHistory } from "@/lib/cf-api"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !user.cfHandle) {
      return Response.json({ error: "No Codeforces handle connected" }, { status: 400 })
    }

    const ratingHistory = await getCFRatingHistory(user.cfHandle)

    return Response.json({ ratingHistory })
  } catch (error) {
    console.error("GET /api/user/rating error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
