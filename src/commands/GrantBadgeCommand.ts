import { prisma } from "@/lib/prisma"

export class GrantBadgeCommand {
  constructor(private userId: string, private badgeId: string) {}

  async execute(): Promise<void> {
    const exists = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId: this.userId,
          badgeId: this.badgeId,
        }
      }
    })

    if (!exists) {
      await prisma.userBadge.create({
        data: {
          userId: this.userId,
          badgeId: this.badgeId,
        }
      })

      await prisma.notification.create({
        data: {
          userId: this.userId,
          type: "badge_earned",
          title: "New Badge Earned!",
          message: `You just earned a new badge!`,
          data: { badgeId: this.badgeId },
        }
      })
      console.log(`[GrantBadgeCommand] Granted badge ${this.badgeId} to ${this.userId}`)
    }
  }
}
