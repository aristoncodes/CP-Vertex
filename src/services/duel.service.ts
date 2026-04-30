import { prisma } from "@/lib/prisma"

interface CreateDuelParams {
  userId: string;
  opponentId: string;
  questionCount: number;
  minRating?: number;
  maxRating?: number;
}

export class DuelService {
  static async createDuel({ userId, opponentId, questionCount, minRating, maxRating }: CreateDuelParams) {
    if (opponentId === userId) {
      throw new Error("Cannot duel yourself")
    }

    const [player1, player2] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { cfRating: true, name: true, cfHandle: true, cfVerified: true } }),
      prisma.user.findUnique({ where: { id: opponentId }, select: { cfRating: true, name: true, cfHandle: true, cfVerified: true } }),
    ])

    if (!player2) {
      throw new Error("Opponent not found")
    }

    if (!player1?.cfHandle || !player1?.cfVerified) {
      throw new Error("You must verify your Codeforces profile in Settings before dueling.")
    }
    if (!player2.cfHandle) {
      throw new Error("Opponent hasn't linked their Codeforces profile yet.")
    }

    let finalMin = minRating
    let finalMax = maxRating

    if (finalMin === undefined || finalMax === undefined) {
      const avgRating = Math.round(((player1?.cfRating || 800) + (player2?.cfRating || 800)) / 2)
      finalMin = avgRating - 100
      finalMax = avgRating + 100
    }

    const problems = await prisma.problem.findMany({
      where: {
        rating: { gte: finalMin, lte: finalMax },
      },
      take: 200,
      orderBy: { solvedCount: "desc" },
    })

    if (problems.length < questionCount) {
      throw new Error(`Not enough problems found in rating range. Found ${problems.length}, needed ${questionCount}.`)
    }

    const selectedProblems: string[] = [];
    const available = [...problems];
    for (let i = 0; i < questionCount; i++) {
      const idx = Math.floor(Math.random() * available.length);
      selectedProblems.push(available[idx].id);
      available.splice(idx, 1);
    }

    const endsAt = new Date()
    endsAt.setHours(endsAt.getHours() + 2)

    const duel = await prisma.duel.create({
      data: {
        player1Id: userId,
        player2Id: opponentId,
        problemIds: selectedProblems,
        questionCount,
        endsAt,
      },
    })

    const challengerName = player1?.name || player1?.cfHandle || "Someone"
    await prisma.notification.create({
      data: {
        userId: opponentId,
        type: "duel_challenge",
        title: "New Duel Challenge!",
        message: `${challengerName} has challenged you to a ${questionCount}-question duel!`,
        data: {
          duelId: duel.id,
          challengerName,
          questionCount,
          minRating: finalMin,
          maxRating: finalMax,
        },
      },
    })

    return duel
  }

  static async getUserDuels(userId: string, history: boolean) {
    return await prisma.duel.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
        status: history
          ? { in: ["completed", "expired", "declined"] }
          : { in: ["pending", "active"] },
      },
      include: {
        player1: { select: { id: true, name: true, cfHandle: true } },
        player2: { select: { id: true, name: true, cfHandle: true } },
      },
      orderBy: { startedAt: "desc" },
      take: history ? 20 : 50,
    })
  }
}
