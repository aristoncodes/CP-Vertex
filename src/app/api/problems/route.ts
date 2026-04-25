import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tag = searchParams.get("tag")
    const minRating = searchParams.get("minRating")
    const maxRating = searchParams.get("maxRating")
    const search = searchParams.get("search")
    const status = searchParams.get("status") // "solved" | "attempted" | "unsolved"
    const sort = searchParams.get("sort") || "rating" // "rating" | "solvedCount" | "title"
    const order = searchParams.get("order") || "asc"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100)
    const skip = (page - 1) * limit

    // Get current user for solved status
    const session = await auth()
    const userId = session?.user?.id

    const where: Record<string, unknown> = {}

    if (tag) {
      where.tags = { some: { tag: { name: tag } } }
    }

    if (minRating || maxRating) {
      where.rating = {}
      if (minRating) (where.rating as Record<string, number>).gte = parseInt(minRating)
      if (maxRating) (where.rating as Record<string, number>).lte = parseInt(maxRating)
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { cfId: { contains: search, mode: "insensitive" } },
      ]
    }

    // If filtering by status, we need to get user's solved/attempted problem IDs first
    let solvedIds: Set<string> | null = null
    let attemptedIds: Set<string> | null = null

    if (userId && (status || true)) {
      // Always fetch for status marking
      const [solved, attempted] = await Promise.all([
        prisma.submission.findMany({
          where: { userId, verdict: "OK" },
          select: { problemId: true },
          distinct: ["problemId"],
        }),
        prisma.submission.findMany({
          where: { userId, verdict: { not: "OK" } },
          select: { problemId: true },
          distinct: ["problemId"],
        }),
      ])
      solvedIds = new Set(solved.map(s => s.problemId))
      attemptedIds = new Set(attempted.map(s => s.problemId))
      // Remove solved from attempted
      for (const id of solvedIds) attemptedIds.delete(id)
    }

    // Apply status filter at the DB level if possible
    if (status && userId && solvedIds && attemptedIds) {
      if (status === "solved") {
        where.id = { in: Array.from(solvedIds) }
      } else if (status === "attempted") {
        where.id = { in: Array.from(attemptedIds) }
      } else if (status === "unsolved") {
        const allTouched = new Set([...solvedIds, ...attemptedIds])
        where.id = { notIn: Array.from(allTouched) }
      }
    }

    const orderBy: Record<string, string> = {}
    if (sort === "solvedCount") orderBy.solvedCount = order
    else if (sort === "title") orderBy.title = order
    else orderBy.rating = order

    const [problems, total] = await Promise.all([
      prisma.problem.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.problem.count({ where }),
    ])

    return Response.json({
      problems: problems.map((p) => {
        let pStatus: "solved" | "attempted" | "unsolved" = "unsolved"
        if (solvedIds?.has(p.id)) pStatus = "solved"
        else if (attemptedIds?.has(p.id)) pStatus = "attempted"

        return {
          id: p.id,
          cfId: p.cfId,
          cfLink: p.cfLink,
          title: p.title,
          rating: p.rating,
          solvedCount: p.solvedCount,
          tags: p.tags.map((pt) => pt.tag.name),
          status: pStatus,
        }
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/problems error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
