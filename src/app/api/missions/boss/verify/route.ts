import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFSubmissions } from "@/lib/cf-api"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { awardXP } from "@/lib/xp"
import { emitXPGain, emitLevelUp } from "@/lib/realtime"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.api, session.user.id)
    if (rateLimited) return rateLimited

    const cfId = request.nextUrl.searchParams.get("cfId")
    if (!cfId) {
      return Response.json({ error: "Missing cfId parameter" }, { status: 400 })
    }

    // Parse cfId into contestId and index (e.g., "1234A" -> contestId=1234, index="A")
    const match = cfId.match(/^(\d+)([A-Z]\d*)$/i)
    if (!match) {
      return Response.json({ error: "Invalid cfId format" }, { status: 400 })
    }
    const targetContestId = parseInt(match[1])
    const targetIndex = match[2].toUpperCase()

    // Get user's CF handle
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfHandle: true },
    })

    if (!user?.cfHandle) {
      return Response.json({ error: "No Codeforces handle linked", message: "Please link your CF handle first." }, { status: 400 })
    }

    // Check recent submissions on CF (last 50)
    const submissions = await getCFSubmissions(user.cfHandle, 1, 50)
    const solved = submissions.some(
      (s) =>
        s.problem.contestId === targetContestId &&
        s.problem.index === targetIndex &&
        s.verdict === "OK"
    )

    if (!solved) {
      return Response.json({
        solved: false,
        message: "Problem not solved yet. Submit an accepted solution on Codeforces, then verify again.",
      })
    }

    // Check if boss mission already completed today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const bossMission = await prisma.mission.findFirst({
      where: { type: "boss" },
    })

    if (bossMission) {
      const userMission = await prisma.userMission.findFirst({
        where: {
          userId: session.user.id,
          missionId: bossMission.id,
          date: today,
        },
      })

      if (userMission && !userMission.completed) {
        // Mark mission as complete
        await prisma.userMission.update({
          where: { id: userMission.id },
          data: {
            completed: true,
            completedAt: new Date(),
            progress: userMission.target,
            xpAwarded: bossMission.xpReward,
          },
        })

        // Award XP
        const { xpAwarded, newLevel, leveledUp } = await awardXP(
          session.user.id,
          bossMission.xpReward,
          "boss_fight"
        )

        await emitXPGain(session.user.id, xpAwarded, "boss_fight")
        if (leveledUp) {
          await emitLevelUp(session.user.id, newLevel)
        }

        return Response.json({
          solved: true,
          xpAwarded,
          newLevel,
          leveledUp,
          message: `Boss defeated! +${xpAwarded} XP earned!`,
        })
      }

      if (userMission?.completed) {
        return Response.json({
          solved: true,
          xpAwarded: 0,
          message: "Boss already defeated today!",
        })
      }
    }

    // No boss mission record but problem was solved
    return Response.json({
      solved: true,
      xpAwarded: 0,
      message: "Problem solved! Boss defeated!",
    })
  } catch (error) {
    console.error("GET /api/missions/boss/verify error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
