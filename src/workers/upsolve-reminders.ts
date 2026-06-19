import { Queue, Worker } from "bullmq"
import { prisma } from "@/lib/prisma"
import { bullMQConnection } from "@/lib/redis"

interface ReminderJobData {
  userId: string
  contestId: number
  contestName: string
  itemCount: number
  n: 1 | 2 | 3
}

interface GraveyardJobData {
  userId: string
  contestId: number
}

export const upsolveReminderQueue = new Queue<ReminderJobData | GraveyardJobData>(
  "upsolve-reminders",
  { connection: bullMQConnection }
)

export async function scheduleReminders(
  userId: string,
  contestId: number,
  contestName: string,
  itemCount: number
): Promise<void> {
  const jobId = (n: number) => `upsolve:${userId}:${contestId}:r${n}`

  // Check if already scheduled
  const existing = await upsolveReminderQueue.getJob(jobId(1))
  if (existing) return

  // Reminder 1 — 24 hours
  await upsolveReminderQueue.add(
    "reminder",
    { userId, contestId, contestName, itemCount, n: 1 },
    { delay: 1000 * 60 * 60 * 24, jobId: jobId(1) }
  )

  // Reminder 2 — 72 hours
  await upsolveReminderQueue.add(
    "reminder",
    { userId, contestId, contestName, itemCount, n: 2 },
    { delay: 1000 * 60 * 60 * 72, jobId: jobId(2) }
  )

  // Reminder 3 — 7 days
  await upsolveReminderQueue.add(
    "reminder",
    { userId, contestId, contestName, itemCount, n: 3 },
    { delay: 1000 * 60 * 60 * 24 * 7, jobId: jobId(3) }
  )

  // Graveyard — 14 days
  await upsolveReminderQueue.add(
    "graveyard",
    { userId, contestId },
    { delay: 1000 * 60 * 60 * 24 * 14, jobId: jobId(99) }
  )
}

export async function cancelReminders(userId: string, contestId: number): Promise<void> {
  for (const n of [1, 2, 3, 99]) {
    const jobId = `upsolve:${userId}:${contestId}:r${n}`
    const job = await upsolveReminderQueue.getJob(jobId)
    if (job) await job.remove()
  }
}

function getReminderMessage(n: 1 | 2 | 3, contest: string, pending: number): string {
  const s = pending > 1 ? "s" : ""
  const messages: Record<1 | 2 | 3, string> = {
    1: `${pending} problem${s} from ${contest} still unsolved. 2× XP active for the next few hours.`,
    2: `Still haven't upsolved ${contest}. ${pending} problem${s} waiting. 1.5× XP active.`,
    3: `Last week to upsolve ${contest}. ${pending} problem${s} move to graveyard in 7 days.`,
  }
  return messages[n]
}

function getReminderTitle(n: 1 | 2 | 3): string {
  const titles: Record<1 | 2 | 3, string> = {
    1: "Upsolve while it's fresh 🔥",
    2: "Still unsolved — 1.5× XP waiting",
    3: "Last chance: graveyard in 7 days",
  }
  return titles[n]
}

const upsolveReminderWorker = new Worker<ReminderJobData | GraveyardJobData>(
  "upsolve-reminders",
  async (job) => {
    if (job.name === "reminder") {
      const { userId, contestId, contestName, n } = job.data as ReminderJobData

      // Check if there are still pending target items
      const pending = await prisma.upsolveItem.count({
        where: {
          userId,
          contestParticipation: { contestId },
          status: "pending",
          category: "target",
        },
      })
      if (pending === 0) return

      await prisma.notification.create({
        data: {
          userId,
          type: "upsolve_reminder",
          title: getReminderTitle(n),
          message: getReminderMessage(n, contestName, pending),
          contestId: String(contestId),
        },
      })

      console.log(`Upsolve reminder #${n} sent for user ${userId} contest ${contestId}`)
    }

    if (job.name === "graveyard") {
      const { userId, contestId } = job.data as GraveyardJobData

      const updated = await prisma.upsolveItem.updateMany({
        where: {
          userId,
          contestParticipation: { contestId },
          status: "pending",
        },
        data: { status: "graveyard", xpMultiplier: 0.5 },
      })

      console.log(`Moved ${updated.count} items to graveyard for user ${userId} contest ${contestId}`)
    }
  },
  { connection: bullMQConnection }
)

upsolveReminderWorker.on("completed", (job) => {
  console.log(`Upsolve reminder job ${job.id} completed`)
})

upsolveReminderWorker.on("failed", (job, err) => {
  console.error(`Upsolve reminder job ${job?.id} failed:`, err)
})

export default upsolveReminderWorker
