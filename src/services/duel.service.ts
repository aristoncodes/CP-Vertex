/**
 * Duel Service
 * 
 * Business logic for 1v1 duel matchmaking, acceptance, and verification.
 * Called by API route handlers in src/app/api/duels/
 */

import { prisma } from "@/lib/prisma"
import { getCFSubmissions } from "@/lib/cf-api"

export async function createDuel(challengerId: string, opponentId: string) {
  // Get both users' ratings
  const [player1, player2] = await Promise.all([
    prisma.user.findUnique({ where: { id: challengerId }, select: { cfRating: true } }),
    prisma.user.findUnique({ where: { id: opponentId }, select: { cfRating: true } }),
  ])

  if (!player2) throw new Error("Opponent not found")

  const avgRating = Math.round(((player1?.cfRating || 800) + (player2?.cfRating || 800)) / 2)

  // Find a problem at the average rating
  const problem = await prisma.problem.findFirst({
    where: { rating: { gte: avgRating - 100, lte: avgRating + 100 } },
    orderBy: { solvedCount: "desc" },
  })

  if (!problem) throw new Error("No suitable problem found")

  // Create duel (expires in 2 hours)
  const endsAt = new Date()
  endsAt.setHours(endsAt.getHours() + 2)

  return prisma.duel.create({
    data: {
      player1Id: challengerId,
      player2Id: opponentId,
      problemId: problem.id,
      endsAt,
    },
  })
}

export async function acceptDuel(duelId: string, userId: string) {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } })
  if (!duel) throw new Error("Duel not found")
  if (duel.player2Id !== userId) throw new Error("Only the challenged player can accept")
  if (duel.status !== "pending") throw new Error("Duel is not pending")

  return prisma.duel.update({
    where: { id: duelId },
    data: { status: "active" },
  })
}

export async function verifyDuel(duelId: string) {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: { player1: true, player2: true, problem: true },
  })

  if (!duel) throw new Error("Duel not found")
  if (duel.status !== "active") throw new Error("Duel is not active")

  // Check if time expired
  if (new Date() > duel.endsAt) {
    return prisma.duel.update({ where: { id: duelId }, data: { status: "expired" } })
  }

  let p1Solved = false, p2Solved = false
  let p1Wa = duel.p1WaCount, p2Wa = duel.p2WaCount

  // Check Player 1 submissions
  if (duel.player1.cfHandle) {
    const subs = await getCFSubmissions(duel.player1.cfHandle, 1, 20)
    for (const sub of subs) {
      if (new Date(sub.creationTimeSeconds * 1000) >= duel.startedAt) {
        if (`${sub.problem.contestId}${sub.problem.index}` === duel.problem.cfId) {
          if (sub.verdict === "OK") p1Solved = true
          else p1Wa++
        }
      }
    }
  }

  // Check Player 2 submissions
  if (duel.player2.cfHandle) {
    const subs = await getCFSubmissions(duel.player2.cfHandle, 1, 20)
    for (const sub of subs) {
      if (new Date(sub.creationTimeSeconds * 1000) >= duel.startedAt) {
        if (`${sub.problem.contestId}${sub.problem.index}` === duel.problem.cfId) {
          if (sub.verdict === "OK") p2Solved = true
          else p2Wa++
        }
      }
    }
  }

  let winnerId = null
  let newStatus = duel.status
  if (p1Solved) { winnerId = duel.player1Id; newStatus = "completed" }
  else if (p2Solved) { winnerId = duel.player2Id; newStatus = "completed" }

  const updated = await prisma.duel.update({
    where: { id: duelId },
    data: { status: newStatus, winnerId, p1WaCount: p1Wa, p2WaCount: p2Wa },
  })

  if (winnerId) {
    await prisma.user.update({
      where: { id: winnerId },
      data: { xp: { increment: 500 } },
    })
  }

  return updated
}

export async function getUserDuels(userId: string, history = false) {
  return prisma.duel.findMany({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
      status: history ? { in: ["completed", "expired"] } : { in: ["pending", "active"] },
    },
    include: {
      player1: { select: { id: true, name: true, cfHandle: true } },
      player2: { select: { id: true, name: true, cfHandle: true } },
      problem: { select: { title: true, rating: true } },
    },
    orderBy: { startedAt: "desc" },
    take: history ? 20 : 50,
  })
}
