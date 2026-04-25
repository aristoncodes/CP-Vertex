import { redis } from "@/lib/redis"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import { auth } from "@/auth"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const scope = searchParams.get("scope") || "global"
    const period = searchParams.get("period") || "all"
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 100)

    let leaderboardKey = "leaderboard:global"
    if (period === "weekly") {
      const now = new Date()
      const year = now.getFullYear()
      const week = getISOWeek(now)
      leaderboardKey = `leaderboard:week:${year}-${String(week).padStart(2, "0")}`
    }

    // Try Redis ZSET first
    const redisEntries = await redis.zrange(leaderboardKey, 0, limit - 1, {
      rev: true,
      withScores: true,
    })

    if (redisEntries && redisEntries.length > 0) {
      // Parse Redis results
      const entries: { userId: string; xp: number; rank: number }[] = []
      for (let i = 0; i < redisEntries.length; i += 2) {
        entries.push({
          userId: redisEntries[i] as string,
          xp: redisEntries[i + 1] as number,
          rank: Math.floor(i / 2) + 1,
        })
      }

      // Fetch user details
      const userIds = entries.map((e) => e.userId)
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          image: true,
          cfHandle: true,
          cfRating: true,
          level: true,
          xp: true,
        },
      })
      const userMap = new Map(users.map((u) => [u.id, u]))

      return Response.json({
        leaderboard: entries.map((e) => ({
          rank: e.rank,
          xp: e.xp,
          ...userMap.get(e.userId),
        })),
        period,
        scope,
      })
    }

    // Fallback to database if Redis failed/empty and we are looking at global
    if (period === "weekly") {
      return Response.json({
        leaderboard: [], // Weekly data relies on Redis cron. If empty, return empty instead of global.
        period,
        scope,
      })
    }

    const session = await auth()
    let whereClause = {}
    if (scope === "friends" && session?.user?.id) {
      // Mock friends list: currently just the user until friends system is built
      whereClause = { id: session.user.id }
    } else if (scope === "friends") {
      return Response.json({ leaderboard: [], period, scope })
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { xp: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        image: true,
        cfHandle: true,
        cfRating: true,
        level: true,
        xp: true,
      },
    })

    return Response.json({
      leaderboard: users.map((u, i) => ({
        rank: i + 1,
        ...u,
      })),
      period,
      scope,
    })
  } catch (error) {
    console.error("GET /api/leaderboard error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getISOWeek(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}
