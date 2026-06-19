import { auth } from "@/auth"
import { generateHint } from "@/lib/intelligence"
import { prisma } from "@/lib/prisma"

// POST /api/hints — Request a hint for a problem
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { problemId, level } = await request.json()
    if (!problemId || !level) {
      return Response.json({ error: "problemId and level are required" }, { status: 400 })
    }

    const result = await generateHint(session.user.id, problemId, level)

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 400 })
    }

    return Response.json(result)
  } catch (error) {
    console.error("POST /api/hints error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET /api/hints?problemId=xxx — Get all hints the user has unlocked for a problem
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const problemId = searchParams.get("problemId")
    if (!problemId) {
      return Response.json({ error: "problemId is required" }, { status: 400 })
    }

    const hints = await prisma.problemHint.findMany({
      where: { userId: session.user.id, problemId },
      orderBy: { hintLevel: "asc" },
      select: {
        hintLevel: true,
        hintText: true,
        xpCost: true,
        createdAt: true,
      },
    })

    return Response.json({
      hints,
      maxLevel: 4,
      nextLevel: hints.length > 0 ? Math.min(4, hints[hints.length - 1].hintLevel + 1) : 1,
      xpCosts: [0, 10, 25, 50],
    })
  } catch (error) {
    console.error("GET /api/hints error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
