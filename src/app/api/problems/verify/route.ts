import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFSubmissions } from "@/lib/cf-api"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { NextRequest } from "next/server"
import { getWACountBeforeAC, isWeakTag, calculateXP, awardXP } from "@/lib/xp"

/**
 * POST /api/problems/verify
 * Body: { cfId: "1234A" }
 * 
 * Checks the user's last 20 Codeforces submissions to see if they
 * have an accepted (OK) verdict for the given problem.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.cfConnect, session.user.id);
    if (rateLimited) return rateLimited;

    const { cfId } = await request.json()
    if (!cfId || typeof cfId !== "string") {
      return Response.json({ error: "Missing cfId" }, { status: 400 })
    }

    // Get the user's CF handle
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfHandle: true, level: true },
    })

    if (!user?.cfHandle) {
      return Response.json(
        { error: "No Codeforces handle connected. Link your account in Settings first." },
        { status: 400 }
      )
    }

    // Parse cfId into contestId + index (e.g. "1234A" → contestId=1234, index="A")
    const match = cfId.match(/^(\d+)([A-Za-z]\d?)$/)
    if (!match) {
      return Response.json({ error: "Invalid problem ID format" }, { status: 400 })
    }
    const targetContestId = parseInt(match[1])
    const targetIndex = match[2].toUpperCase()

    // Fetch last 20 submissions from Codeforces
    const submissions = await getCFSubmissions(user.cfHandle, 1, 20)

    // Check if any submission is an AC for this problem
    const accepted = submissions.find(
      (sub) =>
        sub.problem.contestId === targetContestId &&
        sub.problem.index.toUpperCase() === targetIndex &&
        sub.verdict === "OK"
    )

    if (accepted) {
      // Also record it in our DB if not already there
      const problem = await prisma.problem.findUnique({ where: { cfId } })
      if (problem) {
        const existingSub = await prisma.submission.findUnique({
          where: { cfSubmissionId: String(accepted.id) },
        })
        if (!existingSub) {
          await prisma.submission.create({
            data: {
              userId: session.user.id,
              cfSubmissionId: String(accepted.id),
              problemId: problem.id,
              verdict: accepted.verdict,
              language: accepted.programmingLanguage,
              timeMs: accepted.timeConsumedMillis,
              memoryKb: Math.round(accepted.memoryConsumedBytes / 1024),
              submittedAt: new Date(accepted.creationTimeSeconds * 1000),
            },
          })

          // Calculate Dynamic XP
          const problemTags = await prisma.problemTag.findMany({
            where: { problemId: problem.id },
            select: { tagId: true }
          })
          
          const tagIds = problemTags.map(pt => pt.tagId)
          const waCount = await getWACountBeforeAC(session.user.id, problem.id)
          const isClean = waCount === 0
          const weakTag = await isWeakTag(session.user.id, tagIds)
          
          const ratingXP = calculateXP(
            problem.rating || 800,
            user.level,
            isClean,
            weakTag
          )
          
          // Award XP and handle level up
          const { leveledUp, newLevel } = await awardXP(session.user.id, ratingXP, "problem_verify")

          return Response.json({
            verified: true,
            verdict: "OK",
            language: accepted.programmingLanguage,
            timeMs: accepted.timeConsumedMillis,
            xpAwarded: ratingXP,
            leveledUp,
            newLevel,
            message: `Accepted! +${ratingXP} XP` + (leveledUp ? ` 🎉 Level Up to ${newLevel}!` : ""),
          })
        }
      }

      return Response.json({
        verified: true,
        verdict: "OK",
        language: accepted.programmingLanguage,
        timeMs: accepted.timeConsumedMillis,
        xpAwarded: 0,
        message: "Already recorded — submission verified!",
      })
    }

    // Check if there's a non-AC submission (they tried but didn't solve it)
    const attempted = submissions.find(
      (sub) =>
        sub.problem.contestId === targetContestId &&
        sub.problem.index.toUpperCase() === targetIndex
    )

    if (attempted) {
      return Response.json({
        verified: false,
        verdict: attempted.verdict,
        message: `Found submission but verdict is ${attempted.verdict}. Keep trying!`,
      })
    }

    return Response.json({
      verified: false,
      verdict: null,
      message: "No submission found for this problem in your last 20 submissions. Solve it on Codeforces first!",
    })
  } catch (error) {
    console.error("POST /api/problems/verify error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
