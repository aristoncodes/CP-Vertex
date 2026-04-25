import { Worker } from "bullmq"
import { bullMQConnection } from "@/lib/redis"
import { generateCoachInsights } from "@/lib/coach"

interface CoachJobData {
  userId: string
}

const worker = new Worker<CoachJobData>(
  "coach-insights",
  async (job) => {
    const { userId } = job.data
    await generateCoachInsights(userId)
  },
  { connection: bullMQConnection }
)

worker.on("completed", (job) => {
  console.log(`Coach insights generated for job ${job.id}`)
})

worker.on("failed", (job, err) => {
  console.error(`Coach insights failed for job ${job?.id}:`, err)
})

export default worker
