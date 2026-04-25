import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { cfHandle: username },
          { name: username },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        cfHandle: true,
        cfRating: true,
        xp: true,
        level: true,
        createdAt: true,
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: "desc" },
        },
        topicScores: {
          include: { tag: true },
          orderBy: { score: "desc" },
        },
        roadmaps: {
          include: {
            weeks: {
              orderBy: { weekNumber: "asc" },
            },
          },
          orderBy: { generatedAt: "desc" },
          take: 1,
        },
      },
    })

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Heatmap: last 365 days (full year like Codeforces)
    const oneYearAgo = new Date()
    oneYearAgo.setDate(oneYearAgo.getDate() - 365)

    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id,
        verdict: "OK",
        submittedAt: { gte: oneYearAgo },
      },
      select: { submittedAt: true, xpAwarded: true },
    })

    const heatmap: Record<string, { count: number; xpCount: number }> = {}
    for (const sub of submissions) {
      const dateKey = sub.submittedAt.toISOString().split("T")[0]
      if (!heatmap[dateKey]) heatmap[dateKey] = { count: 0, xpCount: 0 }
      heatmap[dateKey].count += 1
      // xpAwarded > 0 means it was solved on CodeArena (not just CF sync)
      if (sub.xpAwarded > 0) heatmap[dateKey].xpCount += 1
    }

    const uniqueSolved = await prisma.submission.findMany({
      where: { userId: user.id, verdict: "OK" },
      select: { problemId: true },
      distinct: ['problemId'],
    })
    const totalSolved = uniqueSolved.length;

    // Extract active weekly target
    let weeklyTarget = null;
    if (user.roadmaps.length > 0) {
      const activeRoadmap = user.roadmaps[0];
      // Find the first week that is not 100% complete
      const activeWeek = activeRoadmap.weeks.find((w: any) => w.progress < w.targetCount) || activeRoadmap.weeks[activeRoadmap.weeks.length - 1];
      if (activeWeek) {
        // Tag name requires fetching the tag, but we only have tagId.
        // Let's look up the tag name from topicScores if it exists there, or just pass the ID for now.
        const tagObj = user.topicScores.find(ts => ts.tagId === activeWeek.tagId);
        weeklyTarget = {
          weekNumber: activeWeek.weekNumber,
          tag: tagObj ? tagObj.tag.name : "Target Topic",
          progress: activeWeek.progress,
          targetCount: activeWeek.targetCount,
          minRating: activeWeek.minRating,
          maxRating: activeWeek.maxRating,
        };
      }
    }

    return Response.json({
      name: user.name,
      image: user.image,
      cfHandle: user.cfHandle,
      cfRating: user.cfRating,
      xp: user.xp,
      level: user.level,
      createdAt: user.createdAt,
      totalSolved,
      weeklyTarget,
      badges: user.badges.map((ub) => ({
        slug: ub.badge.slug,
        name: ub.badge.name,
        iconEmoji: ub.badge.iconEmoji,
        earnedAt: ub.earnedAt,
      })),
      topicScores: user.topicScores.map((ts) => ({
        tag: ts.tag.name,
        score: ts.score,
        trend: ts.trend,
        solved: ts.acCount,
        attempted: ts.totalAttempts,
      })),
      heatmap: Object.entries(heatmap).map(([date, { count, xpCount }]) => ({ date, count, xpCount })),
    })
  } catch (error) {
    console.error("GET /api/user/[username] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
