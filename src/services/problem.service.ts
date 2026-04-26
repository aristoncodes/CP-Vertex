/**
 * Problem Service
 * 
 * Business logic for problem fetching, importing, and the "pick for me" feature.
 * Called by API route handlers in src/app/api/problems/
 */

import { prisma } from "@/lib/prisma"
import { getCFProblems } from "@/lib/cf-api"

export async function getUserSolvedStatus(userId: string) {
  const [solved, attempted] = await Promise.all([
    prisma.submission.findMany({
      where: { userId, verdict: "OK" },
      select: { problemId: true },
      distinct: ["problemId"],
    }),
    prisma.submission.findMany({
      where: { userId, verdict: { not: "OK" } },
      select: { problemId: true },
      distinct: ["problemId"],
    }),
  ])

  const solvedIds = new Set(solved.map(s => s.problemId))
  const attemptedIds = new Set(attempted.map(s => s.problemId))
  for (const id of solvedIds) attemptedIds.delete(id)

  return { solvedIds, attemptedIds }
}

export async function pickProblemForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cfRating: true },
  })
  const userRating = user?.cfRating || 800

  const { solvedIds } = await getUserSolvedStatus(userId)

  const candidates = await prisma.problem.findMany({
    where: {
      rating: { gte: userRating + 200, lte: userRating + 300 },
      id: { notIn: Array.from(solvedIds) },
    },
    include: { tags: { include: { tag: true } } },
    take: 50,
  })

  if (candidates.length === 0) return null

  return candidates[Math.floor(Math.random() * candidates.length)]
}

export async function importAllCFProblems() {
  const { problems, problemStatistics } = await getCFProblems()

  const statsMap = new Map<string, number>()
  for (const s of problemStatistics) {
    statsMap.set(`${s.contestId}${s.index}`, s.solvedCount)
  }

  let imported = 0, skipped = 0

  for (const p of problems) {
    if (!p.rating || !p.contestId) { skipped++; continue }

    const cfId = `${p.contestId}${p.index}`
    try {
      const problem = await prisma.problem.upsert({
        where: { cfId },
        create: {
          cfId,
          cfLink: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
          title: p.name,
          rating: p.rating,
          solvedCount: statsMap.get(cfId) || 0,
          contestId: p.contestId,
        },
        update: {
          title: p.name,
          rating: p.rating,
          solvedCount: statsMap.get(cfId) || 0,
        },
      })

      for (const tagName of p.tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: { name: tagName, category: "topic" },
          update: {},
        })
        await prisma.problemTag.upsert({
          where: { problemId_tagId: { problemId: problem.id, tagId: tag.id } },
          create: { problemId: problem.id, tagId: tag.id },
          update: {},
        })
      }
      imported++
    } catch {
      skipped++
    }
  }

  return { imported, skipped, total: problems.length }
}
