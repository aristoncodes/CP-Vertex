import { withAuth } from "@/lib/withAuth";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_request, userId) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch recent data in parallel
    const [submissions, duels, missions, badges] = await Promise.all([
      // Recent accepted submissions (last 30 days)
      prisma.submission.findMany({
        where: {
          userId,
          verdict: "OK",
          submittedAt: { gte: thirtyDaysAgo },
        },
        include: {
          problem: { select: { title: true, rating: true, cfId: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 15,
      }),

      // Recent completed duels
      prisma.duel.findMany({
        where: {
          OR: [{ player1Id: userId }, { player2Id: userId }],
          status: { in: ["completed", "expired"] },
          startedAt: { gte: thirtyDaysAgo },
        },
        include: {
          player1: { select: { id: true, name: true, cfHandle: true } },
          player2: { select: { id: true, name: true, cfHandle: true } },
        },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),

      // Recent completed missions
      prisma.userMission.findMany({
        where: {
          userId,
          completed: true,
          completedAt: { gte: thirtyDaysAgo },
        },
        include: {
          mission: { select: { title: true, xpReward: true, type: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 10,
      }),

      // Recent badges
      prisma.userBadge.findMany({
        where: {
          userId,
          earnedAt: { gte: thirtyDaysAgo },
        },
        include: {
          badge: { select: { name: true, iconEmoji: true, description: true } },
        },
        orderBy: { earnedAt: "desc" },
        take: 5,
      }),
    ]);

    // Build unified timeline
    type ActivityItem = {
      id: string;
      type: "solve" | "duel_win" | "duel_loss" | "duel_draw" | "mission" | "badge";
      title: string;
      subtitle: string;
      timestamp: string;
      meta?: Record<string, unknown>;
    };

    const activities: ActivityItem[] = [];

    // Submissions
    for (const s of submissions) {
      activities.push({
        id: `sub-${s.id}`,
        type: "solve",
        title: `Solved ${s.problem.title}`,
        subtitle: `${s.problem.cfId} · Rating ${s.problem.rating}`,
        timestamp: s.submittedAt.toISOString(),
        meta: {
          rating: s.problem.rating,
          xp: s.xpAwarded,
          cfId: s.problem.cfId,
        },
      });
    }

    // Duels
    for (const d of duels) {
      const isP1 = d.player1Id === userId;
      const opponent = isP1 ? d.player2 : d.player1;
      const opponentName = opponent?.name || opponent?.cfHandle || "Unknown";

      let type: ActivityItem["type"] = "duel_draw";
      let title = `Drew against ${opponentName}`;

      if (d.winnerId === userId) {
        type = "duel_win";
        title = `Beat ${opponentName} in a duel`;
      } else if (d.winnerId && d.winnerId !== userId) {
        type = "duel_loss";
        title = `Lost to ${opponentName} in a duel`;
      } else if (d.status === "expired") {
        type = "duel_draw";
        title = `Duel with ${opponentName} expired`;
      }

      activities.push({
        id: `duel-${d.id}`,
        type,
        title,
        subtitle: `${d.questionCount}Q · ${d.timeLimit}min`,
        timestamp: d.startedAt.toISOString(),
        meta: {
          duelId: d.id,
          opponentName,
          questionCount: d.questionCount,
        },
      });
    }

    // Missions
    for (const m of missions) {
      activities.push({
        id: `mission-${m.id}`,
        type: "mission",
        title: `Completed: ${m.mission.title}`,
        subtitle: `+${m.mission.xpReward} XP`,
        timestamp: (m.completedAt || m.date).toISOString(),
        meta: { xp: m.mission.xpReward },
      });
    }

    // Badges
    for (const b of badges) {
      activities.push({
        id: `badge-${b.id}`,
        type: "badge",
        title: `Earned badge: ${b.badge.name}`,
        subtitle: b.badge.description,
        timestamp: b.earnedAt.toISOString(),
        meta: { emoji: b.badge.iconEmoji },
      });
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return Response.json({ activities: activities.slice(0, 20) });
  } catch (error) {
    console.error("GET /api/activity/recent error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});
