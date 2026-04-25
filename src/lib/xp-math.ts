const BASE_RATING = 800
const LEVEL_RATING_STEP = 28       // rating added per level
const DIFF_EXPONENT = 1.5          // steepness of difficulty curve
const DECAY_RATE = 0.015           // XP reduction per level

export function getExpectedRating(level: number): number {
  return BASE_RATING + (level * LEVEL_RATING_STEP)
}

/**
 * Calculate XP using relative scaling.
 */
export function calculateXP(
  problemRating: number,
  userLevel: number,
  isClean: boolean,       // zero WA before AC
  isWeakTag: boolean,     // problem tag is one of user's weak topics
): number {
  // 1. Base
  const base = problemRating * 0.1

  // 2. Difficulty factor — how hard is this relative to your level
  const expectedRating = getExpectedRating(userLevel)
  const difficultyFactor = Math.pow(problemRating / expectedRating, DIFF_EXPONENT)

  // 3. Level decay — higher level = less raw XP
  const levelDecay = 1 + (userLevel * DECAY_RATE)

  // 4. Bonus multipliers
  const cleanBonus   = isClean   ? 1.25 : 1.0
  const weakBonus    = isWeakTag ? 1.50 : 1.0

  const xp = (base * difficultyFactor / levelDecay) * cleanBonus * weakBonus

  // Floor, minimum 1 XP so nothing ever feels completely pointless
  return Math.max(1, Math.floor(xp))
}

// XP threshold to reach each level
export function buildXPThresholds(): number[] {
  const thresholds = [0] // Level 1 starts at 0 XP
  let cumulative = 0

  for (let level = 1; level <= 99; level++) {
    let xpNeeded: number

    if (level <= 10)      xpNeeded = 500
    else if (level <= 25) xpNeeded = 1_000
    else if (level <= 40) xpNeeded = 2_500
    else if (level <= 60) xpNeeded = 5_000
    else if (level <= 80) xpNeeded = 10_000
    else                  xpNeeded = 25_000

    cumulative += xpNeeded
    thresholds.push(cumulative)
  }

  return thresholds // thresholds[n] = total XP needed to reach level n+1
}

export function getLevelFromXP(totalXP: number): number {
  const thresholds = buildXPThresholds()
  let level = 1
  for (let i = 0; i < thresholds.length; i++) {
    if (totalXP >= thresholds[i]) level = i + 1
    else break
  }
  return Math.min(level, 100)
}

export function getXPToNextLevel(totalXP: number): { current: number, needed: number, progress: number } {
  const thresholds = buildXPThresholds()
  const level = getLevelFromXP(totalXP)
  if (level >= 100) return { current: 0, needed: 0, progress: 1 }

  const currentThreshold = thresholds[level - 1]
  const nextThreshold    = thresholds[level]
  const current  = totalXP - currentThreshold
  const needed   = nextThreshold - currentThreshold
  const progress = current / needed

  return { current, needed, progress }
}
