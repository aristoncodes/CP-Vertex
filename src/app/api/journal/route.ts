import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { awardXP } from "@/lib/xp"
import { emitXPGain } from "@/lib/realtime"
import { z } from "zod"
import { NextRequest } from "next/server"

const journalSchema = z.object({
  problemId: z.string().min(1),
  coreIdea: z.string().min(10, "Core idea must be at least 10 characters"),
  approach: z.string().min(10, "Approach must be at least 10 characters"),
  personalRating: z.number().min(1).max(5),
  isPublic: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)
    const tag = searchParams.get("tag")
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { userId: session.user.id }
    if (tag) {
      // Search journals by problem tag (not direct field)
      const problemsWithTag = await prisma.problem.findMany({
        where: { tags: { some: { tag: { name: tag } } } },
        select: { id: true },
      })
      where.problemId = { in: problemsWithTag.map((p) => p.id) }
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ])

    return Response.json({
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("GET /api/journal error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.api, session.user.id)
    if (rateLimited) return rateLimited

    const body = await request.json()
    const parsed = journalSchema.safeParse(body)
    if (!parsed.success) {
      console.error("journal validation error:", parsed.error.flatten())
      return Response.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const JOURNAL_XP = 10
    const entry = await prisma.journalEntry.create({
      data: {
        userId: session.user.id,
        ...parsed.data,
      },
    })

    // Award 10 XP
    const { xpAwarded } = await awardXP(session.user.id, JOURNAL_XP, "journal")
    await emitXPGain(session.user.id, xpAwarded, "journal")

    return Response.json({ entry, xpAwarded })
  } catch (error) {
    console.error("POST /api/journal error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
