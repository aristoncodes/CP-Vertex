import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
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

    const body = await request.json().catch(() => ({}))
    const bossId = body.bossId as string | undefined

    if (!bossId) {
      return Response.json({ error: "Missing bossId" }, { status: 400 })
    }

    // Lock this boss in Redis so the user sees the same one until solved/retreated
    // Expires after 24h as a safety net
    const engagedKey = `boss:engaged:${session.user.id}`
    await redis.setex(engagedKey, 86400, bossId)

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

// DELETE: retreat from boss fight
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Clear the engaged boss
    const engagedKey = `boss:engaged:${session.user.id}`
    await redis.del(engagedKey)

    return Response.json({ message: "Retreated from boss fight" })
  } catch (error) {
    console.error("DELETE /api/missions/boss/engage error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
