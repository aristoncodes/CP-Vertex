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
    // Mock user avg rating
    vi.mocked(prisma.submission.findMany)
      .mockResolvedValueOnce([
        { problem: { rating: 1200 } } as any,
      ]) // for getUserAvgRating
      .mockResolvedValueOnce([
        { verdict: 'OK', submittedAt: new Date(), problemId: 'p1', problem: { rating: 1500, tags: [] } } as any,
        { verdict: 'WRONG_ANSWER', submittedAt: new Date(), problemId: 'p1', problem: { rating: 1500, tags: [] } } as any,
      ]) // for computeTopicScore main query

    vi.mocked(prisma.submission.count).mockResolvedValueOnce(1) // 1 WA
    vi.mocked(prisma.topicScore.findUnique).mockResolvedValueOnce(null) // no prev score

    const result = await computeTopicScore('user1', 'tag1')
    
    // acCount = 1, totalAttempts = 2 -> base = 50
    // hard bonus = +5 (1500 > 1200)
    // recency = +3
    // WA penalty = 0 (1 WA for 1 AC = avg 1, max(0, 1-1)*5 = 0)
    // Final = 50 + 5 + 3 = 58
    expect(result.score).toBe(58)
  })
})
