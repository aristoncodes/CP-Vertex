import { prisma } from "@/lib/prisma"
import { IProblemRepo } from "./IProblemRepo"
import { Problem } from "@/generated/prisma/client"

export class PrismaProblemRepo implements IProblemRepo {
  async findByRating(min: number, max: number, limit: number = 200): Promise<Problem[]> {
    return await prisma.problem.findMany({
      where: {
        rating: { gte: min, lte: max },
      },
      take: limit,
      orderBy: { solvedCount: "desc" },
    })
  }

  async markSolved(userId: string, problemId: string): Promise<void> {
    // Basic implementation of marking a problem solved via a Submission
    // Assumes existence of Submission model based on CP context
    await prisma.submission.create({
      data: {
        userId,
        problemId,
        cfSubmissionId: `manual_${userId}_${problemId}_${Date.now()}`,
        verdict: "OK",
        language: "unknown",
        submittedAt: new Date(),
      }
    })
  }
}
