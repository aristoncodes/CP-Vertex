import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { z } from "zod"

const createDuelSchema = z.object({
  opponentId: z.string().min(1),
  questionCount: z.number().int().min(1).max(5).optional().default(1),
  minRating: z.number().optional(),
  maxRating: z.number().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.duel, session.user.id)
    if (rateLimited) return rateLimited

    const body = await request.json()
    const parsed = createDuelSchema.safeParse(body)
    if (!parsed.success) {
      console.error("duels validation error:", parsed.error.flatten())
      return Response.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const { opponentId, questionCount, minRating, maxRating } = parsed.data

    if (opponentId === session.user.id) {
      return Response.json({ error: "Cannot duel yourself" }, { status: 400 })
    }

    // Get both users' info (including verification status)
    const [player1, player2] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { cfRating: true, name: true, cfHandle: true, cfVerified: true } }),
      prisma.user.findUnique({ where: { id: opponentId }, select: { cfRating: true, name: true, cfHandle: true, cfVerified: true } }),
    ])

    if (!player2) {
      return Response.json({ error: "Opponent not found" }, { status: 404 })
    }

    // Both players must have verified CF profiles
    if (!player1?.cfHandle || !player1?.cfVerified) {
      return Response.json({ error: "You must verify your Codeforces profile in Settings before dueling." }, { status: 400 })
    }
    if (!player2.cfHandle) {
      return Response.json({ error: "Opponent hasn't linked their Codeforces profile yet." }, { status: 400 })
    }

    let finalMin = minRating
    let finalMax = maxRating

    if (finalMin === undefined || finalMax === undefined) {
      const avgRating = Math.round(((player1?.cfRating || 800) + (player2?.cfRating || 800)) / 2)
      finalMin = avgRating - 100
      finalMax = avgRating + 100
    }

    // Find problems in the rating range
    const problems = await prisma.problem.findMany({
      where: {
        rating: { gte: finalMin, lte: finalMax },
      },
      take: 200,
      orderBy: { solvedCount: "desc" },
    })

    if (problems.length < questionCount) {
      return Response.json({ error: `Not enough problems found in rating range. Found ${problems.length}, needed ${questionCount}.` }, { status: 404 })
    }

    // Pick unique problems randomly
    const selectedProblems = [];
    const available = [...problems];
    for (let i = 0; i < questionCount; i++) {
      const idx = Math.floor(Math.random() * available.length);
      selectedProblems.push(available[idx].id);
      available.splice(idx, 1);
    }

    // Create duel (expires in 2 hours)
    const endsAt = new Date()
    endsAt.setHours(endsAt.getHours() + 2)

    const duel = await prisma.duel.create({
      data: {
        player1Id: session.user.id,
        player2Id: opponentId,
        problemIds: selectedProblems,
        questionCount,
        endsAt,
      },
    })

    // Create notification for opponent
    const challengerName = player1?.name || player1?.cfHandle || "Someone"
    await prisma.notification.create({
      data: {
        userId: opponentId,
        type: "duel_challenge",
        title: "New Duel Challenge!",
        message: `${challengerName} has challenged you to a ${questionCount}-question duel!`,
        data: {
          duelId: duel.id,
          challengerName,
          questionCount,
          minRating: finalMin,
          maxRating: finalMax,
        },
      },
    })

    return Response.json({
      duel: {
        id: duel.id,
        problemIds: selectedProblems,
        status: duel.status,
        questionCount: duel.questionCount,
        endsAt: duel.endsAt,
      },
    })
  } catch (error) {
    console.error("POST /api/duels error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const history = url.searchParams.get("history") === "true"

    const duels = await prisma.duel.findMany({
      where: {
        OR: [{ player1Id: session.user.id }, { player2Id: session.user.id }],
        status: history
          ? { in: ["completed", "expired", "declined"] }
          : { in: ["pending", "active"] },
      },
      include: {
        player1: { select: { id: true, name: true, cfHandle: true } },
        player2: { select: { id: true, name: true, cfHandle: true } },
      },
      orderBy: { startedAt: "desc" },
      take: history ? 20 : 50,
    })

    return Response.json({ duels })
  } catch (error) {
    console.error("GET /api/duels error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
