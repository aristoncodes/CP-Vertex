import { expect, test, describe, vi, beforeEach } from 'vitest'
import { computeTopicScore, getUserAvgRating, getAvgWABeforeAC } from '@/lib/strength'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    submission: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    topicScore: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    }
  }
}))

describe('strength.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('getUserAvgRating returns 800 for no submissions', async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([])
    const avg = await getUserAvgRating('user1')
    expect(avg).toBe(800)
  })

  test('getAvgWABeforeAC calculates correctly', async () => {
    vi.mocked(prisma.submission.count).mockResolvedValue(4) // 4 WA across 2 AC problems
    const avgWA = await getAvgWABeforeAC('user1', ['prob1', 'prob2'])
    expect(avgWA).toBe(2)
  })

  test('computeTopicScore returns 0 when no attempts', async () => {
    vi.mocked(prisma.submission.findMany).mockResolvedValue([])
    const result = await computeTopicScore('user1', 'tag1')
    expect(result.score).toBe(0)
    expect(result.acCount).toBe(0)
  })

  test('computeTopicScore calculates score accurately', async () => {
    // computeTopicScore issues, in order:
    //   1. submission.findMany  -> the topic's submissions (main query)
    //   2. submission.findMany  -> getUserAvgRating()
    //   3. topicScore.findUnique -> previous score (for trend)
    vi.mocked(prisma.submission.findMany)
      .mockResolvedValueOnce([
        { verdict: 'OK', submittedAt: new Date(), problemId: 'p1', problem: { rating: 1500 } } as any,
        { verdict: 'OK', submittedAt: new Date(), problemId: 'p2', problem: { rating: 1500 } } as any,
        { verdict: 'WRONG_ANSWER', submittedAt: new Date(), problemId: 'p3', problem: { rating: 1500 } } as any,
      ]) // main query: 2 AC + 1 WA -> totalAttempts = 3, acCount = 2
      .mockResolvedValueOnce([
        { problem: { rating: 1200 } } as any,
      ]) // getUserAvgRating -> userAvg = 1200

    vi.mocked(prisma.topicScore.findUnique).mockResolvedValueOnce(null) // no prev score

    const result = await computeTopicScore('user1', 'tag1')

    // Weighted 4-component formula (see strength.ts):
    //   C1 AC rate    = (2/3) * 35              = 23.333
    //   C2 difficulty = min(1.5, 1500/1200)/1.5 * 30 = 25
    //   C3 volume     = min(1, 2/30) * 20       =  1.333
    //   C4 recency    = min(1, 2/5) * 15        =  6
    //   raw = 55.667 -> round = 56
    expect(result.score).toBe(56)
    expect(result.acCount).toBe(2)
    expect(result.totalAttempts).toBe(3)
  })
})
