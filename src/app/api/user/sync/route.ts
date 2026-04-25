import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { fetchAllSubmissions } from "@/lib/cf-api"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit
    const rateLimited = await checkRateLimit(rateLimits.cfConnect, session.user.id)
    if (rateLimited) return rateLimited

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user || !user.cfHandle) {
      return Response.json(
        { error: "No Codeforces handle connected. Please connect your handle first." },
        { status: 400 }
      )
    }

    // Import submissions in background (non-blocking)
    importSubmissions(session.user.id, user.cfHandle).catch((err) =>
      console.error("Background submission sync failed:", err)
    )

    return Response.json({
      message: "Submissions sync started in the background",
    })
  } catch (error) {
    console.error("POST /api/user/sync error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function importSubmissions(userId: string, handle: string) {
  const submissions = await fetchAllSubmissions(handle)

  for (const sub of submissions) {
    if (!sub.problem.rating) continue
    const cfId = `${sub.problem.contestId}${sub.problem.index}`

    // Ensure problem exists
    let problem = await prisma.problem.findUnique({ where: { cfId } })
    if (!problem) {
      problem = await prisma.problem.create({
        data: {
          cfId,
          cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
          title: sub.problem.name,
          rating: sub.problem.rating,
          contestId: sub.problem.contestId,
        },
      })
    }

    // Upsert submission
    await prisma.submission.upsert({
      where: { cfSubmissionId: String(sub.id) },
      create: {
        userId,
        cfSubmissionId: String(sub.id),
        problemId: problem.id,
        verdict: sub.verdict,
        language: sub.programmingLanguage,
        timeMs: sub.timeConsumedMillis,
        memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
        submittedAt: new Date(sub.creationTimeSeconds * 1000),
      },
      update: {},
    })
  }

  // Mark sync complete
  await prisma.user.update({
    where: { id: userId },
    data: { cfSynced: true, cfLastSync: new Date() },
  })
}
