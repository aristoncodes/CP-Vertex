import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFSubmissions } from "@/lib/cf-api"
import { awardXP } from "@/lib/xp"
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

    const rateLimited = await checkRateLimit(rateLimits.duelVerify, session.user.id);
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

    if (duel.player1Id !== session.user.id && duel.player2Id !== session.user.id) {
      return Response.json({ error: "Forbidden: Not a participant" }, { status: 403 })
    }

    if (duel.status !== "active") {
      return Response.json({ error: "Duel is not active" }, { status: 400 })
    }

    // If the clock ran out, the duel ends now and is decided by score below
    // (more problems solved wins; equal — including 0–0 — is a draw).
    const timeUp = new Date() > duel.endsAt;

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

    // SHARED-CLAIM model: both players race the SAME current problem
    // (problems are claimed in order, so the current one sits at index
    // p1Progress + p2Progress). Whoever gets the first AC claims it and
    // scores the point; both then advance to the next problem — so the
    // loser of that problem can't also score it.
    const startMs = duel.startedAt.getTime();
    const scanCurrent = async (handle: string | null, targetCfId: string) => {
      let bestAc = Infinity;
      let wa = 0;
      if (!handle) return { bestAc, wa };
      const subs = await getCFSubmissions(handle, 1, 20);
      for (const sub of subs) {
        if (sub.creationTimeSeconds * 1000 < startMs) continue;
        if (`${sub.problem.contestId}${sub.problem.index}` !== targetCfId) continue;
        if (sub.verdict === "OK") bestAc = Math.min(bestAc, sub.creationTimeSeconds);
        else wa++;
      }
      return { bestAc, wa };
    };

    const currentIndex = p1Progress + p2Progress;
    if (!timeUp && currentIndex < duel.questionCount) {
      const targetCfId = idToCfId[duel.problemIds[currentIndex]];
      const [p1r, p2r] = await Promise.all([
        scanCurrent(duel.player1.cfHandle, targetCfId),
        scanCurrent(duel.player2.cfHandle, targetCfId),
      ]);
      p1Wa += p1r.wa;
      p2Wa += p2r.wa;

      if (p1r.bestAc !== Infinity || p2r.bestAc !== Infinity) {
        // Earliest accepted submission claims the shared problem.
        if (p1r.bestAc <= p2r.bestAc) p1Progress++;
        else p2Progress++;
      }
    }

    // Complete when every problem is claimed, or one player has an
    // unbeatable majority of the points.
    let winnerId: string | null = null;
    let newStatus = duel.status;
    const totalClaimed = p1Progress + p2Progress;
    const majority = Math.floor(duel.questionCount / 2) + 1;
    if (timeUp || totalClaimed >= duel.questionCount || p1Progress >= majority || p2Progress >= majority) {
      newStatus = "completed";
      winnerId =
        p1Progress > p2Progress ? duel.player1Id :
        p2Progress > p1Progress ? duel.player2Id :
        null; // equal score (incl. 0–0) => draw
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
      await awardXP(winnerId, 500, "duel_win") // Flat 500 XP bonus for winning a duel
    }

    // Fetch problems to include in response (matching GET route shape)
    const duelProblems = await prisma.problem.findMany({
      where: { id: { in: updated.problemIds } },
      select: { id: true, title: true, rating: true, cfLink: true, cfId: true },
    })
    const sortedProblems = updated.problemIds
      .map(pid => duelProblems.find(p => p.id === pid))
      .filter(Boolean)

    return Response.json({
      duel: {
        id: updated.id,
        status: updated.status,
        problemIds: updated.problemIds,
        questionCount: updated.questionCount,
        startedAt: updated.startedAt,
        endsAt: updated.endsAt,
        player1: updated.player1,
        player2: updated.player2,
        problems: sortedProblems,
        p1WaCount: updated.p1WaCount,
        p2WaCount: updated.p2WaCount,
        p1Progress: updated.p1Progress,
        p2Progress: updated.p2Progress,
        winnerId: updated.winnerId,
        player1Id: updated.player1Id,
        player2Id: updated.player2Id,
      },
    })
  } catch (error) {
    console.error("POST /api/duels/[id]/verify error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
