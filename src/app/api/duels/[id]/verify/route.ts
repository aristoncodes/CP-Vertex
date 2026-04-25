import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFSubmissions } from "@/lib/cf-api"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { NextRequest } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.cfConnect, session.user.id);
    if (rateLimited) return rateLimited;

    const { id } = await params

    const duel = await prisma.duel.findUnique({
      where: { id },
      include: {
        player1: true,
        player2: true,
        problem: true,
      },
    })

    if (!duel) {
      return Response.json({ error: "Duel not found" }, { status: 404 })
    }

    if (duel.status !== "active") {
      return Response.json({ error: "Duel is not active" }, { status: 400 })
    }

    // Check if time expired
    if (new Date() > duel.endsAt) {
      await prisma.duel.update({
        where: { id },
        data: { status: "expired" },
      })
      return Response.json({ message: "Duel expired", status: "expired" })
    }

    let p1SolveTime = Infinity;
    let p2SolveTime = Infinity;
    let p1Wa = duel.p1WaCount;
    let p2Wa = duel.p2WaCount;

    // Fetch submissions for Player 1 since duel start
    if (duel.player1.cfHandle) {
      const p1Subs = await getCFSubmissions(duel.player1.cfHandle, 1, 20);
      for (const sub of p1Subs) {
        if (new Date(sub.creationTimeSeconds * 1000) >= duel.startedAt) {
          if (`${sub.problem.contestId}${sub.problem.index}` === duel.problem.cfId) {
            if (sub.verdict === "OK" && sub.creationTimeSeconds < p1SolveTime) {
              p1SolveTime = sub.creationTimeSeconds;
            } else if (sub.verdict !== "OK" && sub.creationTimeSeconds < p1SolveTime) {
              p1Wa++;
            }
          }
        }
      }
    }

    // Fetch submissions for Player 2 since duel start
    if (duel.player2.cfHandle) {
      const p2Subs = await getCFSubmissions(duel.player2.cfHandle, 1, 20);
      for (const sub of p2Subs) {
        if (new Date(sub.creationTimeSeconds * 1000) >= duel.startedAt) {
          if (`${sub.problem.contestId}${sub.problem.index}` === duel.problem.cfId) {
            if (sub.verdict === "OK" && sub.creationTimeSeconds < p2SolveTime) {
              p2SolveTime = sub.creationTimeSeconds;
            } else if (sub.verdict !== "OK" && sub.creationTimeSeconds < p2SolveTime) {
              p2Wa++;
            }
          }
        }
      }
    }

    let winnerId = null;
    let newStatus = duel.status;

    if (p1SolveTime !== Infinity || p2SolveTime !== Infinity) {
      newStatus = "completed";
      if (p1SolveTime < p2SolveTime) {
        winnerId = duel.player1Id;
      } else if (p2SolveTime < p1SolveTime) {
        winnerId = duel.player2Id;
      } else {
        // True draw (same second)
        winnerId = null;
      }
    }

    const updated = await prisma.duel.update({
      where: { id },
      data: {
        status: newStatus,
        winnerId,
        p1WaCount: p1Wa,
        p2WaCount: p2Wa,
      },
      include: {
        player1: { select: { id: true, name: true, cfHandle: true } },
        player2: { select: { id: true, name: true, cfHandle: true } },
        problem: { select: { id: true, title: true, rating: true, cfLink: true } },
      },
    })

    // If there is a winner, award XP (simple logic for now)
    if (winnerId) {
      await prisma.user.update({
        where: { id: winnerId },
        data: { xp: { increment: 500 } }, // Flat 500 XP bonus for winning a duel
      })
    }

    return Response.json({ duel: updated })
  } catch (error) {
    console.error("POST /api/duels/[id]/verify error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
