import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const review = await prisma.weeklyReview.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    if (!review) {
      return Response.json({ review: null, message: "No weekly review yet" })
    }

    return Response.json({ review })
  } catch (error) {
    console.error("GET /api/weekly-review error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
