import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]
    const cacheKey = `missions:${session.user.id}:${today}`

    // Check if missions already generated today
    const cachedMissionIds = await redis.get(cacheKey)
    if (cachedMissionIds) {
      const missionIds = JSON.parse(cachedMissionIds as string) as string[]
      const missions = await prisma.userMission.findMany({
        where: { id: { in: missionIds } },
        include: { mission: true },
      })

      return Response.json({
        missions: missions.map((um) => ({
          id: um.id,
          type: um.mission.type,
          title: um.mission.title,
          description: um.mission.description,
          xpReward: um.mission.xpReward,
          completed: um.completed,
          completedAt: um.completedAt,
          progress: um.progress,
          target: um.target,
        })),
      })
    }

    // Get all mission templates
    const missionTemplates = await prisma.mission.findMany()

    if (missionTemplates.length === 0) {
      return Response.json({ missions: [], message: "No missions available" })
    }

    // Pick 3 random missions
    const shuffled = missionTemplates.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(3, shuffled.length))

    // Create user missions for today
    const todayDate = new Date(today)
    const userMissions = await Promise.all(
      selected.map((m) =>
        prisma.userMission.create({
          data: {
            userId: session.user.id,
            missionId: m.id,
            date: todayDate,
            target: 1,
          },
          include: { mission: true },
        })
      )
    )

    // Cache mission IDs for 24 hours
    const missionIds = userMissions.map((um) => um.id)
    await redis.setex(cacheKey, 86400, JSON.stringify(missionIds))

    return Response.json({
      missions: userMissions.map((um) => ({
        id: um.id,
        type: um.mission.type,
        title: um.mission.title,
        description: um.mission.description,
        xpReward: um.mission.xpReward,
        completed: um.completed,
        completedAt: um.completedAt,
        progress: um.progress,
        target: um.target,
      })),
    })
  } catch (error) {
    console.error("GET /api/missions/today error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
