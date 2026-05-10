import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/duels/[id]/live — Duel live status for spectators
 * Implements #17: Basic duel spectator mode
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const duel = await prisma.duel.findUnique({
      where: { id },
      include: {
        player1: { select: { name: true, cfHandle: true, level: true } },
        player2: { select: { name: true, cfHandle: true, level: true } },
      },
    });

    if (!duel) {
      return NextResponse.json({ error: "Duel not found" }, { status: 404 });
    }

    return NextResponse.json({
      duel: {
        id: duel.id,
        status: duel.status,
        startedAt: duel.startedAt,
        endsAt: duel.endsAt,
        challenger: {
          name: duel.player1?.name,
          cfHandle: duel.player1?.cfHandle,
          level: duel.player1?.level,
          solves: duel.p1Progress,
          waCount: duel.p1WaCount,
        },
        opponent: duel.player2
          ? {
              name: duel.player2?.name,
              cfHandle: duel.player2?.cfHandle,
              level: duel.player2?.level,
              solves: duel.p2Progress,
              waCount: duel.p2WaCount,
            }
          : null,
        problemCount: duel.questionCount,
        winnerId: duel.winnerId,
      },
    });
  } catch (error) {
    console.error("GET /api/duels/[id]/live error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
