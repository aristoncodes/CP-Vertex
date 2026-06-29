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
  // Average over DISTINCT solved problems, not raw AC submissions, so
  // re-submitting the same problem doesn't skew the user's average rating.
  const result = await prisma.submission.findMany({
    where: { userId, verdict: "OK" },
    select: { problemId: true, problem: { select: { rating: true } } },
    distinct: ["problemId"],
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
    take: 2000,
  })

  // Collapse submissions to DISTINCT problems. Counting raw submissions
  // double-counts re-submits and many WAs, which skews every component
  // (and the solved/attempted shown on the profile). "Attempted" = a
  // distinct problem with any submission; "solved" = it has an AC.
  const byProblem = new Map<string, { rating: number; solved: boolean; firstSolvedAt: Date | null }>()
  for (const s of subs) {
    const entry = byProblem.get(s.problemId) ?? { rating: s.problem.rating ?? 0, solved: false, firstSolvedAt: null }
    if (s.verdict === "OK") {
      entry.solved = true
      if (!entry.firstSolvedAt || s.submittedAt < entry.firstSolvedAt) entry.firstSolvedAt = s.submittedAt
    }
    byProblem.set(s.problemId, entry)
  }

  const solvedProblems = [...byProblem.values()].filter((p) => p.solved)
  const totalAttempts = byProblem.size
  const acCount = solvedProblems.length

  if (totalAttempts === 0) {
    return { score: 0, trend: "stable", acCount: 0, totalAttempts: 0, avgAttempts: 0 }
  }

  /*
   * Weighted Topic Score (0–100):
   *
   *   Component 1: AC Rate         (35 pts max)
   *     = (acCount / totalAttempts) × 35
   *
   *   Component 2: Difficulty       (30 pts max)
   *     = (avg rating of AC'd problems / user avg rating) × 30, capped at 30
   *     Rewards solving problems at or above your level.
   *
   *   Component 3: Volume           (20 pts max)
   *     = min(1, acCount / 30) × 20
   *     Saturates at 30 solves — you need enough problems to prove competence.
   *
   *   Component 4: Recency          (15 pts max)
   *     = min(1, recentACs / 5) × 15
   *     Saturates at 5 solves in last 30 days. Rewards active practice.
   */

  // Component 1: AC Rate (0–35) — distinct problems solved / attempted
  const acRate = acCount / totalAttempts
  const acRateScore = acRate * 35

  // Component 2: Difficulty (0–30) — avg rating of distinct SOLVED problems
  const userAvg = await getUserAvgRating(userId)
  const topicRatings = solvedProblems
    .map((p) => p.rating)
    .filter((r) => r > 0)
  const avgTopicRating = topicRatings.length > 0
    ? topicRatings.reduce((a, b) => a + b, 0) / topicRatings.length
    : 0
  // Ratio: if you solve 1400-rated problems and your avg is 1200, ratio = 1.17
  const difficultyRatio = userAvg > 0 ? Math.min(1.5, avgTopicRating / userAvg) : 0
  const difficultyScore = (difficultyRatio / 1.5) * 30

  // Component 3: Volume (0–20) — distinct problems solved
  const volumeScore = Math.min(1, acCount / 30) * 20

  // Component 4: Recency (0–15) — distinct problems first solved in last 30 days
  const recentACs = solvedProblems.filter((p) => p.firstSolvedAt && p.firstSolvedAt > thirtyDaysAgo())
  const recencyScore = Math.min(1, recentACs.length / 5) * 15

  const rawScore = acRateScore + difficultyScore + volumeScore + recencyScore
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)))

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
