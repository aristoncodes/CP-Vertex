import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { awardXP } from "@/lib/xp"
import { emitXPGain, emitLevelUp } from "@/lib/realtime"
import { getCFSubmissions } from "@/lib/cf-api"
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
      include: { mission: true, user: { select: { cfHandle: true } } },
    })

    if (!userMission) {
      return Response.json({ error: "Mission not found" }, { status: 404 })
    }

    if (userMission.completed) {
      return Response.json({ error: "Mission already completed" }, { status: 400 })
    }

    const missionType = userMission.mission.type;
    const missionStartSeconds = Math.floor(new Date(userMission.date).getTime() / 1000);
    const todayStart = new Date(userMission.date);

    if (missionType === "solve_tag" || missionType === "speed_solve") {
      if (!userMission.user.cfHandle) {
        return Response.json({ error: "Please link your Codeforces handle first." }, { status: 400 })
      }
      
      let targetCount = 1;
      if (userMission.mission.title === "Daily Grind") targetCount = 2;
      if (missionType === "speed_solve") targetCount = 3;

      try {
        const submissions = await getCFSubmissions(userMission.user.cfHandle, 1, 20);
        const validSolvedIds = new Set<string>();
        
        for (const sub of submissions) {
          if (sub.creationTimeSeconds < missionStartSeconds) break;
          if (sub.verdict === "OK") {
            validSolvedIds.add(`${sub.problem.contestId}-${sub.problem.index}`);
          }
        }
        
        if (validSolvedIds.size < targetCount) {
          return Response.json({ 
            error: `Mission not completed yet. You have solved ${validSolvedIds.size}/${targetCount} unique problems today. Keep going!` 
          }, { status: 400 })
        }
      } catch (error) {
        return Response.json({ error: "Failed to reach Codeforces to verify your mission. Try again later." }, { status: 503 })
      }
    } else if (missionType === "boss_fight" || userMission.mission.title.toLowerCase().includes("boss")) {
      return Response.json({
        error: "To complete this mission, you must engage and defeat the Boss in the Arena!"
      }, { status: 400 })
    } else if (missionType === "duel_win" || userMission.mission.title.toLowerCase().includes("duel")) {
      const wonDuels = await prisma.duel.count({
        where: {
          winnerId: session.user.id,
          startedAt: { gte: todayStart },
        }
      });
      if (wonDuels < 1) {
        return Response.json({
          error: `Mission not completed yet. You haven't won any Duels today. Go to the Arena to challenge someone!`
        }, { status: 400 })
      }
    } else if (missionType === "post_mortem") {
      const pms = await prisma.postMortem.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: todayStart },
        }
      });
      if (pms < 1) {
        return Response.json({
          error: `Mission not completed yet. You haven't written any post-mortems today. Go to an unsolved problem and reflect!`
        }, { status: 400 })
      }
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
