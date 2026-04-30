import { Problem } from "@prisma/client"

export interface IProblemRepo {
  findByRating(min: number, max: number, limit?: number): Promise<Problem[]>
  markSolved(userId: string, problemId: string): Promise<void>
}
