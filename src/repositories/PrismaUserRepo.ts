import { prisma } from "@/lib/prisma"
import { IUserRepo } from "./IUserRepo"
import { User } from "@/generated/prisma/client"

export class PrismaUserRepo implements IUserRepo {
  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({ where: { id } })
  }

  async updateXP(id: string, xp: number): Promise<void> {
    await prisma.user.update({ where: { id }, data: { xp } })
  }

  async updateLevel(id: string, level: number): Promise<void> {
    await prisma.user.update({ where: { id }, data: { level } })
  }

  async incrementXP(id: string, amount: number): Promise<void> {
    await prisma.user.update({ where: { id }, data: { xp: { increment: amount } } })
  }
}
