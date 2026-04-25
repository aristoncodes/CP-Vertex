import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.api, session.user.id)
    if (rateLimited) return rateLimited

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the Boss mission template
    let bossMission = await prisma.mission.findFirst({
      where: { type: "boss" }
    });

    if (!bossMission) {
      bossMission = await prisma.mission.create({
        data: {
          type: "boss",
          title: "Daily Boss Fight",
          description: "Defeat a target 300-500 rating above you.",
          xpReward: 500,
          difficulty: "extreme"
        }
      });
    }

    // Upsert UserMission for today
    const userMission = await prisma.userMission.upsert({
      where: {
        userId_missionId_date: {
          userId: session.user.id,
          missionId: bossMission.id,
          date: today,
        }
      },
      update: {}, // if it exists, do nothing
      create: {
        userId: session.user.id,
        missionId: bossMission.id,
        date: today,
        target: 1,
      }
    });

    return Response.json({ message: "Boss engaged", mission: userMission });
  } catch (error) {
    console.error("POST /api/missions/boss/engage error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
