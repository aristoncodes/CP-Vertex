import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { awardXP } from "@/lib/xp"
import { emitXPGain, emitLevelUp } from "@/lib/realtime"
import { z } from "zod"

const postMortemSchema = z.object({
  submissionId: z.string().min(1),
  failureReasons: z.array(
    z.enum([
      "wrong_approach",
      "edge_case",
      "tle",
      "off_by_one",
      "overflow",
      "misread",
    ])
  ),
  howFixed: z.string().optional(),
  difficultyFelt: z.number().min(1).max(5),
  confidenceNext: z.enum(["yes", "maybe", "no"]),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.postMortem, session.user.id)
    if (rateLimited) return rateLimited

    const body = await request.json()
    const parsed = postMortemSchema.safeParse(body)
    if (!parsed.success) {
      console.error("postmortems validation error:", parsed.error.flatten())
      return Response.json(
        { error: "Invalid input" },
        { status: 400 }
      )
    }

    const { submissionId, failureReasons, howFixed, difficultyFelt, confidenceNext } =
      parsed.data

    // Verify submission belongs to user
    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, userId: session.user.id },
    })
    if (!submission) {
      return Response.json({ error: "Submission not found" }, { status: 404 })
    }

    // Check if post-mortem already exists
    const existing = await prisma.postMortem.findUnique({
      where: { submissionId },
    })
    if (existing) {
      return Response.json({ error: "Post-mortem already exists" }, { status: 409 })
    }

    const PM_XP = 30
    const postMortem = await prisma.postMortem.create({
      data: {
        userId: session.user.id,
        submissionId,
        failureReasons,
        howFixed: howFixed ?? null,
        difficultyFelt,
        confidenceNext,
        xpAwarded: PM_XP,
      },
    })

    // Award 30 XP for post-mortem
    const { xpAwarded, newLevel, leveledUp } = await awardXP(
      session.user.id,
      PM_XP,
      "postmortem"
    )

    await emitXPGain(session.user.id, xpAwarded, "postmortem")
    if (leveledUp) {
      await emitLevelUp(session.user.id, newLevel)
    }

    return Response.json({
      postMortem,
      xpAwarded,
      newLevel,
      leveledUp,
    })
  } catch (error) {
    console.error("POST /api/postmortems error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
