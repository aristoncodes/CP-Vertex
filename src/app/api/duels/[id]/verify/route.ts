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

    // Fetch the actual problems to map problemIds to CF IDs
    const problems = await prisma.problem.findMany({
      where: { id: { in: duel.problemIds } },
      select: { id: true, cfId: true },
    });
    
    // Create a map for quick lookup
    const idToCfId: Record<string, string> = {};
    for (const p of problems) idToCfId[p.id] = p.cfId;

    let p1Wa = duel.p1WaCount;
    let p2Wa = duel.p2WaCount;
    let p1Progress = duel.p1Progress;
    let p2Progress = duel.p2Progress;
    let advanced = false;

    // Fetch submissions for Player 1 since duel start
    if (duel.player1.cfHandle && p1Progress < duel.questionCount) {
      const p1Subs = await getCFSubmissions(duel.player1.cfHandle, 1, 20);
      const currentProblemId = duel.problemIds[p1Progress];
      const targetCfId = idToCfId[currentProblemId];
      
      for (const sub of p1Subs) {
        if (new Date(sub.creationTimeSeconds * 1000) >= duel.startedAt) {
          if (`${sub.problem.contestId}${sub.problem.index}` === targetCfId) {
            if (sub.verdict === "OK") {
              p1Progress++;
              advanced = true;
              break; // they solved it! move to next round immediately. (Only 1 round per poll realistically)
            } else if (sub.verdict !== "OK") {
              p1Wa++;
            }
          }
        }
      }
    }

    // Fetch submissions for Player 2 since duel start
    if (duel.player2.cfHandle && p2Progress < duel.questionCount) {
      const p2Subs = await getCFSubmissions(duel.player2.cfHandle, 1, 20);
      const currentProblemId = duel.problemIds[p2Progress];
      const targetCfId = idToCfId[currentProblemId];
      
      for (const sub of p2Subs) {
        if (new Date(sub.creationTimeSeconds * 1000) >= duel.startedAt) {
          if (`${sub.problem.contestId}${sub.problem.index}` === targetCfId) {
            if (sub.verdict === "OK") {
              p2Progress++;
              advanced = true;
              break;
            } else if (sub.verdict !== "OK") {
              p2Wa++;
            }
          }
        }
      }
    }

    let winnerId = null;
    let newStatus = duel.status;

    if (p1Progress >= duel.questionCount || p2Progress >= duel.questionCount) {
      newStatus = "completed";
      if (p1Progress >= duel.questionCount && p2Progress >= duel.questionCount) {
        winnerId = null; // Draw (if both advanced simultaneously)
      } else if (p1Progress >= duel.questionCount) {
        winnerId = duel.player1Id;
      } else {
        winnerId = duel.player2Id;
      }
    }

    const updated = await prisma.duel.update({
      where: { id },
      data: {
        status: newStatus,
        winnerId,
        p1WaCount: p1Wa,
        p2WaCount: p2Wa,
        p1Progress,
        p2Progress,
      },
      include: {
        player1: { select: { id: true, name: true, cfHandle: true } },
        player2: { select: { id: true, name: true, cfHandle: true } },
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
