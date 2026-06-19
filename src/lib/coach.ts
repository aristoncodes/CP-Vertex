import { prisma } from "./prisma"
import { getUserAvgRating } from "./strength"

/**
 * Coach Insight Engine — 3 rule-based checks.
 * Same insight type not re-generated within 7 days for the same user.
 */

function sevenDaysAgo(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d
}

function sevenDaysFromNow(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d
}

function thirtyDaysAgo(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d
}

interface CoachRule {
  id: string
  check: (userId: string) => Promise<{ tagId?: string; tagName?: string } | null>
  message: (data: { tagId?: string; tagName?: string }) => string
}

const RULES: CoachRule[] = [
  {
    id: "declining_score",
    check: async (userId: string) => {
      const declining = await prisma.topicScore.findFirst({
        where: { userId, trend: "declining" },
        orderBy: { score: "asc" },
        include: { tag: true },
      })
      if (!declining) return null
      return { tagId: declining.tagId, tagName: declining.tag.name }
    },
    message: (data) =>
      `Your ${data.tagName} score is declining. You're rushing — slow down and check edge cases.`,
  },
  {
    id: "blind_spot",
    check: async (userId: string) => {
      const allTags = await prisma.tag.findMany()
      const userTags = await prisma.topicScore.findMany({
        where: { userId },
        select: { tagId: true },
      })
      const attempted = new Set(userTags.map((t) => t.tagId))
      const blindSpot = allTags.find((t) => !attempted.has(t.id))
      if (!blindSpot) return null
      return { tagId: blindSpot.id, tagName: blindSpot.name }
    },
    message: (data) =>
      `You've never attempted a ${data.tagName} problem. Hundreds of users at your level have.`,
  },
  {
    id: "not_growing",
    check: async (userId: string) => {
      const subs = await prisma.submission.findMany({
        where: {
          userId,
          submittedAt: { gt: thirtyDaysAgo() },
          verdict: "OK",
        },
        include: { problem: true },
      })
      if (subs.length < 5) return null // not enough data

      const avg = await getUserAvgRating(userId)
      const below = subs.filter((s) => (s.problem.rating ?? 0) < avg - 200)
      if (below.length / subs.length > 0.8) return {}
      return null
    },
    message: () =>
      `80% of your recent problems are below your level. You need harder problems to grow.`,
  },
]

/**
 * Run all coach insight rules for a user.
 * Creates new insights if rules fire and no duplicate within 7 days.
 */
export async function generateCoachInsights(userId: string): Promise<void> {
  for (const rule of RULES) {
    const data = await rule.check(userId)
    if (!data) continue

    // Check 7-day dedup
    const existing = await prisma.coachInsight.findFirst({
      where: {
        userId,
        type: rule.id,
        createdAt: { gt: sevenDaysAgo() },
      },
    })
    if (existing) continue

    await prisma.coachInsight.create({
      data: {
        userId,
        type: rule.id,
        tagId: data.tagId ?? null,
        message: rule.message(data),
        expiresAt: sevenDaysFromNow(),
      },
    })
  }
}
