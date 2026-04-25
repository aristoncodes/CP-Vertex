import { prisma } from "./prisma"

/**
 * Topic Strength Score Formula:
 *   Base       = (AC count / total attempts) * 100
 *   Hard bonus = +5 per problem above user avg rating
 *   Recency    = +3 per AC in last 30 days
 *   WA penalty = -5 per extra WA before AC (avg)
 *   Final      = clamp(0, 100)
 */

function thirtyDaysAgo(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d
}

export async function getUserAvgRating(userId: string): Promise<number> {
  const result = await prisma.submission.findMany({
    where: { userId, verdict: "OK" },
    include: { problem: { select: { rating: true } } },
  })

  if (result.length === 0) return 800 // default for new users
  const totalRating = result.reduce((sum, s) => sum + (s.problem.rating ?? 0), 0)
  return Math.round(totalRating / result.length)
}

export async function getAvgWABeforeAC(
  userId: string,
  acProblemIds: string[]
): Promise<number> {
  if (acProblemIds.length === 0) return 0

  const totalWA = await prisma.submission.count({
    where: {
      userId,
      problemId: { in: acProblemIds },
      verdict: "WRONG_ANSWER",
    },
  })

  return totalWA / acProblemIds.length
}

export async function computeTopicScore(
  userId: string,
  tagId: string
): Promise<{ score: number; trend: string; acCount: number; totalAttempts: number; avgAttempts: number }> {
  const subs = await prisma.submission.findMany({
    where: {
      userId,
      problem: { tags: { some: { tagId } } },
    },
    include: { problem: true },
    orderBy: { submittedAt: "desc" },
    take: 300,
  })

  const acSubs = subs.filter((s) => s.verdict === "OK")
  const totalAttempts = subs.length
  const acCount = acSubs.length

  if (totalAttempts === 0) {
    return { score: 0, trend: "stable", acCount: 0, totalAttempts: 0, avgAttempts: 0 }
  }

  // Base score
  let score = (acCount / totalAttempts) * 100

  // Hard bonus: +5 per problem above user avg rating
  const userAvg = await getUserAvgRating(userId)
  const hardACs = acSubs.filter((s) => (s.problem.rating ?? 0) > userAvg)
  score += hardACs.length * 5

  // Recency bonus: +3 per AC in last 30 days
  const recentACs = acSubs.filter((s) => s.submittedAt > thirtyDaysAgo())
  score += recentACs.length * 3

  // WA penalty: -5 per extra WA before AC (average)
  const acProblemIds = acSubs.map((s) => s.problemId)
  const avgWA = await getAvgWABeforeAC(userId, acProblemIds)
  score -= Math.max(0, avgWA - 1) * 5

  // Clamp 0-100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)))

  // Determine trend
  const prev = await prisma.topicScore.findUnique({
    where: { userId_tagId: { userId, tagId } },
  })
  let trend = "stable"
  if (prev) {
    if (finalScore > prev.score + 5) trend = "improving"
    else if (finalScore < prev.score - 5) trend = "declining"
  }

  return {
    score: finalScore,
    trend,
    acCount,
    totalAttempts,
    avgAttempts: totalAttempts > 0 ? acCount / totalAttempts : 0,
  }
}

/**
 * Recompute and upsert topic score for a user on a specific tag.
 */
export async function recomputeTopicScore(
  userId: string,
  tagId: string
): Promise<void> {
  const { score, trend, acCount, totalAttempts, avgAttempts } =
    await computeTopicScore(userId, tagId)

  await prisma.topicScore.upsert({
    where: { userId_tagId: { userId, tagId } },
    create: {
      userId,
      tagId,
      score,
      trend,
      acCount,
      totalAttempts,
      avgAttempts,
    },
    update: {
      score,
      trend,
      acCount,
      totalAttempts,
      avgAttempts,
      lastUpdated: new Date(),
    },
  })
}
