import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Delete in dependency order to avoid FK violations
    // 1. PostMortems (depends on Submission)
    await prisma.postMortem.deleteMany({ where: { userId } })

    // 2. Submissions
    await prisma.submission.deleteMany({ where: { userId } })

    // 3. UserMissions
    await prisma.userMission.deleteMany({ where: { userId } })

    // 4. UserBadges
    await prisma.userBadge.deleteMany({ where: { userId } })

    // 5. TopicScores
    await prisma.topicScore.deleteMany({ where: { userId } })

    // 6. CoachInsights
    await prisma.coachInsight.deleteMany({ where: { userId } })

    // 7. JournalEntries
    await prisma.journalEntry.deleteMany({ where: { userId } })

    // 8. Roadmap weeks (via roadmap)
    const roadmap = await prisma.roadmap.findUnique({ where: { userId } })
    if (roadmap) {
      await prisma.roadmapWeek.deleteMany({ where: { roadmapId: roadmap.id } })
      await prisma.roadmap.delete({ where: { userId } })
    }

    // 9. WeeklyReviews
    await prisma.weeklyReview.deleteMany({ where: { userId } })

    // 10. Duels (as player1 or player2)
    await prisma.duel.deleteMany({
      where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
    })

    // 11. Reset user stats
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: 0,
        level: 1,
        streakCurrent: 0,
        streakLongest: 0,
        streakLastDay: null,
        streakFreezes: 1,
        cfLastSync: null,
      },
    })

    // 12. Clean Redis
    await redis.del(`streak:${userId}`)
    await redis.zrem("leaderboard:global", userId)

    return Response.json({ message: "Account reset complete" })
  } catch (error) {
    console.error("POST /api/user/reset error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
