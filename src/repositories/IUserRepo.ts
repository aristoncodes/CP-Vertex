import { User } from "@/generated/prisma/client"

export interface IUserRepo {
  findById(id: string): Promise<User | null>
  updateXP(id: string, xp: number): Promise<void>
  updateLevel(id: string, level: number): Promise<void>
  incrementXP(id: string, amount: number): Promise<void>
}
