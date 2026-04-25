import { prisma } from "./prisma"

export * from "./xp-math"
import { getLevelFromXP } from "./xp-math"

/**
 * Check if any of the given tags are in the user's bottom 3 (weakest) tags.
 */
export async function isWeakTag(userId: string, tagIds: string[]): Promise<boolean> {
  const scores = await prisma.topicScore.findMany({
    where: { userId },
    orderBy: { score: "asc" },
    take: 3,
    select: { tagId: true },
  })

  if (scores.length === 0) return true // new user, everything is "weak"
  const weakTagIds = new Set(scores.map((s) => s.tagId))
  return tagIds.some((id) => weakTagIds.has(id))
}

/**
 * Get WA count for a user on a specific problem before their first AC.
 */
export async function getWACountBeforeAC(
  userId: string,
  problemId: string
): Promise<number> {
  const submissions = await prisma.submission.findMany({
    where: { userId, problemId },
    orderBy: { submittedAt: "asc" },
    select: { verdict: true },
  })

  let waCount = 0
  for (const sub of submissions) {
    if (sub.verdict === "OK") break
    if (sub.verdict === "WRONG_ANSWER") waCount++
  }
  return waCount
}

/**
 * Award XP to a user, handle level-up detection.
 * Returns { xpAwarded, newLevel, leveledUp }
 */
export async function awardXP(
  userId: string,
  xp: number,
  source: string // Not currently stored but could be used for an XP history log
): Promise<{ xpAwarded: number; newLevel: number; leveledUp: boolean }> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { xp: { increment: xp } },
    select: { xp: true, level: true },
  })

  const newLevel = getLevelFromXP(user.xp)
  const leveledUp = newLevel > user.level

  if (leveledUp) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: newLevel },
    })
  }

  return { xpAwarded: xp, newLevel, leveledUp }
}
