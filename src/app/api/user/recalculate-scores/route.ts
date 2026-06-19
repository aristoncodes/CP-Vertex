import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { recomputeTopicScore } from "@/lib/strength"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 })
    }

    const userId = session.user.id

    // Get all topic scores for this user
    const existingScores = await prisma.topicScore.findMany({
      where: { userId },
      select: { tagId: true },
    })

    if (existingScores.length === 0) {
      return Response.json({ message: "No topic scores to recalculate", count: 0 })
    }

    // Recalculate each one with the new formula
    let count = 0
    for (const { tagId } of existingScores) {
      await recomputeTopicScore(userId, tagId)
      count++
    }

    return Response.json({ message: `Recalculated ${count} topic scores`, count })
  } catch (error) {
    console.error("Recalculate topic scores error:", error)
    return Response.json({ error: "Failed to recalculate" }, { status: 500 })
  }
}
