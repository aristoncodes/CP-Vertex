import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all badges
    const allBadges = await prisma.badge.findMany({
      orderBy: { category: "asc" },
    })

    // Get user's earned badges
    const earnedBadges = await prisma.userBadge.findMany({
      where: { userId: session.user.id },
      select: { badgeId: true, earnedAt: true },
    })
    const earnedMap = new Map(earnedBadges.map((b) => [b.badgeId, b.earnedAt]))

    // Calculate progress for locked badges
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        xp: true,
        streakLongest: true,
        _count: {
          select: {
            submissions: { where: { verdict: "OK" } },
            postMortems: true,
          },
        },
      },
    })

    const badges = allBadges.map((badge) => {
      const earned = earnedMap.has(badge.id)
      let progress = 0

      // Simple progress calculation based on badge type
      if (!earned && user) {
        switch (badge.slug) {
          case "first_ac":
            progress = Math.min(100, user._count.submissions > 0 ? 100 : 0)
            break
          case "streak_30":
            progress = Math.min(100, Math.round((user.streakLongest / 30) * 100))
            break
          case "streak_7":
            progress = Math.min(100, Math.round((user.streakLongest / 7) * 100))
            break
          default:
            progress = earned ? 100 : 0
        }
      }

      return {
        id: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        iconEmoji: badge.iconEmoji,
        earned,
        earnedAt: earned ? earnedMap.get(badge.id) : null,
        progress: earned ? 100 : progress,
      }
    })

    return Response.json({ badges })
  } catch (error) {
    console.error("GET /api/badges error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
