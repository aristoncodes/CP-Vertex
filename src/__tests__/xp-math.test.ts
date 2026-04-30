import { expect, test, describe } from 'vitest'
import { getExpectedRating, calculateXP, getLevelFromXP, getXPToNextLevel } from '@/lib/xp-math'

describe('xp-math.ts', () => {
  test('getExpectedRating calculates correctly', () => {
    expect(getExpectedRating(1)).toBe(828)
    expect(getExpectedRating(10)).toBe(1080)
  })

  test('calculateXP handles clean and weak bonuses', () => {
    const baseXP = calculateXP(1200, 10, false, false)
    const cleanXP = calculateXP(1200, 10, true, false)
    const weakXP = calculateXP(1200, 10, false, true)
    const bothXP = calculateXP(1200, 10, true, true)

    expect(cleanXP).toBeGreaterThan(baseXP)
    expect(weakXP).toBeGreaterThan(baseXP)
    expect(bothXP).toBeGreaterThan(cleanXP)
  })

  test('calculateXP ensures minimum 1 XP', () => {
    expect(calculateXP(100, 100, false, false)).toBeGreaterThanOrEqual(1)
  })

  test('getLevelFromXP returns correct level', () => {
    expect(getLevelFromXP(0)).toBe(1)
    expect(getLevelFromXP(499)).toBe(1)
    expect(getLevelFromXP(500)).toBe(2)
    expect(getLevelFromXP(1000)).toBe(3)
  })

  test('getXPToNextLevel returns correct progress', () => {
    const result = getXPToNextLevel(250)
    expect(result.current).toBe(250)
    expect(result.needed).toBe(500)
    expect(result.progress).toBe(0.5)
  })
})
