import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { awardXP } from "@/lib/xp"
import { emitXPGain, emitLevelUp } from "@/lib/realtime"
import { NextRequest } from "next/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.api, session.user.id)
    if (rateLimited) return rateLimited

    const { id } = await params

    const userMission = await prisma.userMission.findFirst({
      where: { id, userId: session.user.id },
      include: { mission: true },
    })

    if (!userMission) {
      return Response.json({ error: "Mission not found" }, { status: 404 })
    }

    if (userMission.completed) {
      return Response.json({ error: "Mission already completed" }, { status: 400 })
    }

    // Mark complete
    await prisma.userMission.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date(),
        progress: userMission.target,
        xpAwarded: userMission.mission.xpReward,
      },
    })

    // Award XP
    const { xpAwarded, newLevel, leveledUp } = await awardXP(
      session.user.id,
      userMission.mission.xpReward,
      "mission"
    )

    // Emit realtime events
    await emitXPGain(session.user.id, xpAwarded, "mission")
    if (leveledUp) {
      await emitLevelUp(session.user.id, newLevel)
    }

    return Response.json({
      success: true,
      xpAwarded,
      newLevel,
      leveledUp,
    })
  } catch (error) {
    console.error("PATCH /api/missions/[id]/complete error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
