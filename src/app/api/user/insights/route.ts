import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id;

    // Fetch topics (top 10 by score)
    const topicScores = await prisma.topicScore.findMany({
      where: { userId },
      include: { tag: true },
      orderBy: { score: "desc" },
      take: 10,
    });

    // Format topics for frontend
    const topics = topicScores.map(t => ({
      tag: t.tag.name,
      score: Math.round(t.score),
      trend: t.trend, // 'up', 'down', 'stable', etc.
      solved: t.acCount,
      attempted: t.totalAttempts,
    }));

    // Fetch the most recent gemini tactical insight, or any recent insight
    const insights = await prisma.coachInsight.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 1, // Just get the latest one
    });

    const formattedInsights = insights.map(i => ({
      type: i.type,
      message: i.message,
      priority: "high" as const,
    }));

    return Response.json({
      topics,
      insights: formattedInsights,
    });
  } catch (error) {
    console.error("GET /api/user/insights error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
