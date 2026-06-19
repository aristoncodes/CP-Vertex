import { Worker } from "bullmq"
import { prisma } from "@/lib/prisma"
import { bullMQConnection } from "@/lib/redis"

interface WeeklyDigestJobData {
  userId: string
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

async function getWeekStats(
  userId: string,
  weekStart: Date
): Promise<{ xp: number; solved: number; submissions: number }> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const submissions = await prisma.submission.findMany({
    where: {
      userId,
      submittedAt: { gte: weekStart, lt: weekEnd },
    },
    select: { verdict: true, xpAwarded: true },
  })

  const solved = submissions.filter((s) => s.verdict === "OK").length
  const xp = submissions.reduce((sum, s) => sum + s.xpAwarded, 0)

  return { xp, solved, submissions: submissions.length }
}

const worker = new Worker<WeeklyDigestJobData>(
  "weekly-digest",
  async (job) => {
    const { userId } = job.data
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return

    const thisWeekStart = getWeekStart(new Date())
    const lastWeekStart = getWeekStart(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )

    const thisWeek = await getWeekStats(userId, thisWeekStart)
    const lastWeek = await getWeekStats(userId, lastWeekStart)

    // Find best and worst tags
    const topicScores = await prisma.topicScore.findMany({
      where: { userId },
      include: { tag: true },
      orderBy: { score: "desc" },
    })

    const bestTag = topicScores[0]?.tag.name ?? null
    const worstTag = topicScores[topicScores.length - 1]?.tag.name ?? null

    // Store review snapshot
    await prisma.weeklyReview.upsert({
      where: {
        userId_weekStart: { userId, weekStart: thisWeekStart },
      },
      create: {
        userId,
        weekStart: thisWeekStart,
        totalXp: thisWeek.xp,
        problemsSolved: thisWeek.solved,
        bestTag,
        worstTag,
        streakStatus: user.streakCurrent > 0 ? "alive" : "broken",
        data: { thisWeek, lastWeek },
      },
      update: {
        totalXp: thisWeek.xp,
        problemsSolved: thisWeek.solved,
        bestTag,
        worstTag,
        streakStatus: user.streakCurrent > 0 ? "alive" : "broken",
        data: { thisWeek, lastWeek },
      },
    })

    // Send email via Resend (production only)
    // import { Resend } from 'resend'
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: process.env.RESEND_FROM!,
    //   to: user.email,
    //   subject: `Your week: ${thisWeek.solved} problems, ${thisWeek.xp} XP`,
    //   html: `...`
    // })
  },
  { connection: bullMQConnection }
)

worker.on("completed", (job) => {
  console.log(`Weekly digest completed for job ${job.id}`)
})

worker.on("failed", (job, err) => {
  console.error(`Weekly digest failed for job ${job?.id}:`, err)
})

export default worker
