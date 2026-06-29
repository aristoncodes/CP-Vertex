import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { getCFRatingHistory } from "@/lib/cf-api"
import { getLevelFromXP } from "@/lib/xp-math"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

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
        streakCurrent: true,
        streakLongest: true,
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
    const oneMonthAgo = new Date()
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30)
    const oneMonthAgoTime = oneMonthAgo.getTime()

    const submissions = await prisma.submission.findMany({
      where: {
        userId: user.id,
        verdict: "OK",
        submittedAt: { gte: oneYearAgo },
      },
      select: { submittedAt: true, xpAwarded: true, problemId: true, problem: { select: { rating: true } } },
      orderBy: { submittedAt: "asc" },
    })

    // IST date key (aligns with streak calculation)
    const istKey = (d: Date) => new Date(d.getTime() + 330 * 60000).toISOString().split("T")[0]

    // Per-day: distinct problems solved that day, + the hardest rating solved.
    const heatmap: Record<string, { count: number; xpCount: number; maxRating: number; pids: Set<string> }> = {}
    const yearProblems = new Set<string>()
    const monthProblems = new Set<string>()
    for (const sub of submissions) {
      yearProblems.add(sub.problemId)
      if (sub.submittedAt.getTime() >= oneMonthAgoTime) monthProblems.add(sub.problemId)
      const dateKey = istKey(sub.submittedAt)
      const cell = heatmap[dateKey] ?? (heatmap[dateKey] = { count: 0, xpCount: 0, maxRating: 0, pids: new Set() })
      if (!cell.pids.has(sub.problemId)) {
        cell.pids.add(sub.problemId)
        cell.count += 1
        if (sub.xpAwarded > 0) cell.xpCount += 1
      }
      const r = sub.problem?.rating ?? 0
      if (r > cell.maxRating) cell.maxRating = r
    }

    // Longest consecutive-day streak within a set of active days.
    const longestStreak = (dates: string[]): number => {
      const days = [...new Set(dates)]
        .map((d) => Math.floor(new Date(d + "T00:00:00Z").getTime() / 86400000))
        .sort((a, b) => a - b)
      let best = 0, cur = 0, prev: number | null = null
      for (const d of days) {
        cur = prev !== null && d === prev + 1 ? cur + 1 : 1
        if (cur > best) best = cur
        prev = d
      }
      return best
    }
    const activeDays = Object.keys(heatmap)
    const monthAgoKey = istKey(oneMonthAgo)
    const streakLastYear = longestStreak(activeDays)
    const streakLastMonth = longestStreak(activeDays.filter((d) => d >= monthAgoKey))

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
          why: activeWeek.why || null,
          subtopics: activeWeek.subtopics || [],
        };
      }
    }

    // Friendship status relative to logged-in viewer
    let friendshipStatus: "none" | "pending_sent" | "pending_received" | "friends" = "none"
    const session = await auth()
    if (session?.user?.id && session.user.id !== user.id) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: user.id },
            { senderId: user.id, receiverId: session.user.id },
          ],
        },
      })
      if (friendship) {
        if (friendship.status === "accepted") friendshipStatus = "friends"
        else if (friendship.status === "pending" && friendship.senderId === session.user.id) friendshipStatus = "pending_sent"
        else if (friendship.status === "pending" && friendship.receiverId === session.user.id) friendshipStatus = "pending_received"
      }
    }

    return Response.json({
      name: user.name,
      image: user.image,
      cfHandle: user.cfHandle,
      cfRating: user.cfRating,
      xp: user.xp,
      level: getLevelFromXP(user.xp),
      streak: user.streakCurrent,
      streakLongest: user.streakLongest,
      createdAt: user.createdAt,
      userId: user.id,
      totalSolved,
      weeklyTarget,
      friendshipStatus,
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
      heatmap: Object.entries(heatmap).map(([date, c]) => ({ date, count: c.count, xpCount: c.xpCount, maxRating: c.maxRating })),
      heatmapStats: {
        solvedAllTime: totalSolved,
        solvedLastYear: yearProblems.size,
        solvedLastMonth: monthProblems.size,
        streakMax: user.streakLongest,
        streakLastYear,
        streakLastMonth,
      },
      ratingHistory: user.cfHandle ? await getCFRatingHistory(user.cfHandle).catch(() => []) : [],
    })
  } catch (error) {
    console.error("GET /api/user/[username] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
