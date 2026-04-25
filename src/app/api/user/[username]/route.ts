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

    const totalSolved = await prisma.submission.count({
      where: { userId: user.id, verdict: "OK" },
    })

    return Response.json({
      name: user.name,
      image: user.image,
      cfHandle: user.cfHandle,
      cfRating: user.cfRating,
      xp: user.xp,
      level: user.level,
      createdAt: user.createdAt,
      totalSolved,
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
