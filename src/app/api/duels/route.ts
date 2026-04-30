import { z } from "zod"
import { withAuth } from "@/lib/withAuth"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { DuelService } from "@/services/duel.service"

const createDuelSchema = z.object({
  opponentId: z.string().min(1),
  questionCount: z.number().int().min(1).max(5).optional().default(1),
  minRating: z.number().optional(),
  maxRating: z.number().optional(),
})

export const POST = withAuth(async (request, userId) => {
  try {
    const rateLimited = await checkRateLimit(rateLimits.duel, userId)
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

    const duel = await DuelService.createDuel({
      userId,
      opponentId,
      questionCount,
      minRating,
      maxRating
    })

    return Response.json({
      duel: {
        id: duel.id,
        problemIds: duel.problemIds,
        status: duel.status,
        questionCount: duel.questionCount,
        endsAt: duel.endsAt,
      },
    })
  } catch (error: any) {
    if (error.message) {
        return Response.json({ error: error.message }, { status: 400 })
    }
    console.error("POST /api/duels error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
})

export const GET = withAuth(async (request, userId) => {
  try {
    const url = new URL(request.url)
    const history = url.searchParams.get("history") === "true"

    const duels = await DuelService.getUserDuels(userId, history)

    return Response.json({ duels })
  } catch (error) {
    console.error("GET /api/duels error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
})
