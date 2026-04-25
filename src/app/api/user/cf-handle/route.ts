import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { validateCFHandle, getCFSubmissions } from "@/lib/cf-api"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"
import { getRedis } from "@/lib/ratelimit"
import { z } from "zod"

const cfHandleSchema = z.object({
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(24, "Handle must be at most 24 characters")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Invalid handle format"),
})

// ─── Step 1: Set handle & get verification challenge ───
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.cfConnect, session.user.id)
    if (rateLimited) return rateLimited

    const body = await request.json()
    const parsed = cfHandleSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 })
    }

    const { handle } = parsed.data

    // Check if handle is already taken
    const existing = await prisma.user.findFirst({
      where: { cfHandle: handle, NOT: { id: session.user.id } },
    })
    if (existing) {
      return Response.json(
        { error: "This Codeforces handle is already connected to another account" },
        { status: 409 }
      )
    }

    // Validate handle exists on Codeforces
    const isValid = await validateCFHandle(handle)
    if (!isValid) {
      return Response.json({ error: "Codeforces handle not found" }, { status: 404 })
    }

    // Pick a random verification problem (easy ones that anyone can submit to)
    const verificationProblems = [
      { contestId: 1, index: "A", name: "Theatre Square" },
      { contestId: 4, index: "A", name: "Watermelon" },
      { contestId: 71, index: "A", name: "Way Too Long Words" },
      { contestId: 158, index: "A", name: "Next Round" },
      { contestId: 231, index: "A", name: "Team" },
      { contestId: 282, index: "A", name: "Bit++" },
      { contestId: 339, index: "A", name: "Helpful Maths" },
      { contestId: 469, index: "A", name: "I Wanna Be the Guy" },
      { contestId: 546, index: "A", name: "Soldier and Bananas" },
      { contestId: 677, index: "A", name: "Vanya and Fence" },
    ]
    const challenge = verificationProblems[Math.floor(Math.random() * verificationProblems.length)]

    // Store the challenge in Redis (expires in 5 minutes)
    const redis = getRedis()
    await redis.setex(
      `cf-verify:${session.user.id}`,
      300, // 5 minutes
      JSON.stringify({
        handle,
        contestId: challenge.contestId,
        index: challenge.index,
        issuedAt: Date.now(),
      })
    )

    // Save handle (but NOT verified yet)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cfHandle: handle, cfVerified: false },
    })

    return Response.json({
      message: "Verification challenge issued",
      challenge: {
        problemName: challenge.name,
        problemUrl: `https://codeforces.com/problemset/problem/${challenge.contestId}/${challenge.index}`,
        contestId: challenge.contestId,
        index: challenge.index,
        instruction: `Submit a Compilation Error (CE) on "${challenge.name}" from your Codeforces account "${handle}" within 5 minutes. Then click Verify.`,
      },
    })
  } catch (error) {
    console.error("PATCH /api/user/cf-handle error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── Step 2: Verify the CE submission ───
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimited = await checkRateLimit(rateLimits.cfConnect, session.user.id)
    if (rateLimited) return rateLimited

    // Get the stored challenge
    const redis = getRedis()
    const raw = await redis.get(`cf-verify:${session.user.id}`)
    if (!raw) {
      return Response.json(
        { error: "No pending verification challenge. Please start over." },
        { status: 400 }
      )
    }

    const challenge = typeof raw === "string" ? JSON.parse(raw) : raw as {
      handle: string
      contestId: number
      index: string
      issuedAt: number
    }

    // Check if challenge expired (5 min)
    if (Date.now() - challenge.issuedAt > 5 * 60 * 1000) {
      await redis.del(`cf-verify:${session.user.id}`)
      return Response.json(
        { error: "Verification expired. Please start a new challenge." },
        { status: 410 }
      )
    }

    // Fetch the user's last 10 submissions from Codeforces
    const submissions = await getCFSubmissions(challenge.handle, 1, 10)

    // Look for a CE verdict on the challenge problem, submitted after challenge was issued
    const issuedAtSeconds = Math.floor(challenge.issuedAt / 1000)
    const ceFound = submissions.some(
      (sub) =>
        sub.problem.contestId === challenge.contestId &&
        sub.problem.index === challenge.index &&
        sub.verdict === "COMPILATION_ERROR" &&
        sub.creationTimeSeconds >= issuedAtSeconds - 30 // 30s grace for clock skew
    )

    if (!ceFound) {
      return Response.json({
        error: `No Compilation Error found on problem ${challenge.contestId}${challenge.index} from "${challenge.handle}". Make sure you submit broken code (e.g. just "asdf") on the correct problem.`,
        verified: false,
      }, { status: 400 })
    }

    // Verified! Update user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { cfVerified: true },
    })

    // Clean up
    await redis.del(`cf-verify:${session.user.id}`)

    // Import submissions in background
    importSubmissions(session.user.id, challenge.handle).catch((err) =>
      console.error("Background submission import failed:", err)
    )

    return Response.json({
      message: "Codeforces handle verified successfully!",
      verified: true,
      cfHandle: challenge.handle,
    })
  } catch (error) {
    console.error("POST /api/user/cf-handle error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── Background import ───
async function importSubmissions(userId: string, handle: string) {
  const { fetchAllSubmissions, getCFUser } = await import("@/lib/cf-api")
  const submissions = await fetchAllSubmissions(handle)

  const uniqueDates = Array.from(new Set(
    submissions.filter(s => s.verdict === "OK").map(s => {
      const d = new Date(s.creationTimeSeconds * 1000)
      return d.toISOString().split("T")[0]
    })
  )).sort((a, b) => b.localeCompare(a))

  let currentStreak = 0;
  let lastActiveDay: Date | null = null;
  const todayDate = new Date();
  const today = todayDate.toISOString().split("T")[0];
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];

  if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
    let checkDate = uniqueDates.includes(today) ? new Date() : yesterdayDate;
    lastActiveDay = new Date(checkDate);
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  for (const sub of submissions) {
    if (!sub.problem.rating) continue
    const cfId = `${sub.problem.contestId}${sub.problem.index}`

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

  let cfRating = 0;
  try {
    const userInfo = await getCFUser(handle);
    if (userInfo && userInfo.length > 0 && userInfo[0].rating) {
      cfRating = userInfo[0].rating;
    }
  } catch (err) {
    console.error("Failed to fetch CF rating during bg import:", err);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { streakLongest: true } });

  await prisma.user.update({
    where: { id: userId },
    data: { 
      cfSynced: true, 
      cfLastSync: new Date(),
      cfRating,
      streakCurrent: currentStreak,
      streakLongest: Math.max(user?.streakLongest || 0, currentStreak),
      ...(lastActiveDay ? { streakLastDay: lastActiveDay } : {})
    },
  })
}
