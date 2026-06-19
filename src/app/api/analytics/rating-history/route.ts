import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFUser } from "@/lib/cf-api"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfHandle: true },
    })

    if (!user?.cfHandle) {
      return Response.json(
        { error: "No Codeforces handle connected" },
        { status: 400 }
      )
    }

    // Fetch rating history from CF API
    try {
      const cfUser = await getCFUser(user.cfHandle)
      return Response.json({
        handle: user.cfHandle,
        currentRating: cfUser[0]?.rating ?? 0,
        maxRating: cfUser[0]?.maxRating ?? 0,
        rank: cfUser[0]?.rank ?? "unrated",
      })
    } catch {
      return Response.json({
        handle: user.cfHandle,
        currentRating: 0,
        maxRating: 0,
        rank: "unrated",
        error: "Could not fetch from Codeforces",
      })
    }
  } catch (error) {
    console.error("GET /api/analytics/rating-history error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
