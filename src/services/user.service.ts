/**
 * User Service
 * 
 * Business logic for user data, CF sync, search, and account management.
 * Called by API route handlers in src/app/api/user/
 */

import { prisma } from "@/lib/prisma"
import { getCFSubmissions, validateCFHandle, fetchAllSubmissions } from "@/lib/cf-api"

export async function syncUserSubmissions(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.cfHandle) throw new Error("No Codeforces handle connected")

  // Rate limit: 5 min between manual syncs
  if (user.cfLastSync) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (user.cfLastSync > fiveMinAgo) throw new Error("Please wait 5 minutes between manual syncs.")
  }

  const submissions = await getCFSubmissions(user.cfHandle, 1, 100)
  let imported = 0

  for (const sub of submissions) {
    if (!sub.problem.rating) continue
    const subDate = new Date(sub.creationTimeSeconds * 1000)
    if (user.cfLastSync && subDate <= user.cfLastSync) continue

    const cfId = `${sub.problem.contestId}${sub.problem.index}`
    let problem = await prisma.problem.findUnique({ where: { cfId } })
    if (!problem) {
      problem = await prisma.problem.create({
        data: {
          cfId,
          cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
          title: sub.problem.name,
          rating: sub.problem.rating,
          contestId: sub.problem.contestId,
        },
      })
    }

    const existing = await prisma.submission.findUnique({
      where: { cfSubmissionId: String(sub.id) },
    })
    if (existing) continue

    await prisma.submission.create({
      data: {
        userId: user.id,
        cfSubmissionId: String(sub.id),
        problemId: problem.id,
        verdict: sub.verdict,
        language: sub.programmingLanguage,
        timeMs: sub.timeConsumedMillis,
        memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
        submittedAt: subDate,
      },
    })
    imported++
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { cfLastSync: new Date() },
  })

  return { imported }
}

export async function searchUsers(query: string, excludeUserId: string) {
  return prisma.user.findMany({
    where: {
      AND: [
        { id: { not: excludeUserId } },
        {
          OR: [
            { cfHandle: { contains: query, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true, name: true, cfHandle: true,
      cfRating: true, level: true, xp: true, image: true,
    },
    take: 10,
  })
}

export async function resetUserAccount(userId: string) {
  await prisma.postMortem.deleteMany({ where: { userId } })
  await prisma.submission.deleteMany({ where: { userId } })
  await prisma.userMission.deleteMany({ where: { userId } })
  await prisma.userBadge.deleteMany({ where: { userId } })
  await prisma.topicScore.deleteMany({ where: { userId } })
  await prisma.coachInsight.deleteMany({ where: { userId } })
  await prisma.journalEntry.deleteMany({ where: { userId } })

  const roadmap = await prisma.roadmap.findUnique({ where: { userId } })
  if (roadmap) {
    await prisma.roadmapWeek.deleteMany({ where: { roadmapId: roadmap.id } })
    await prisma.roadmap.delete({ where: { userId } })
  }

  await prisma.weeklyReview.deleteMany({ where: { userId } })
  await prisma.duel.deleteMany({
    where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: 0, level: 1,
      streakCurrent: 0, streakLongest: 0,
      streakLastDay: null, streakFreezes: 1,
      cfLastSync: null,
    },
  })
}
