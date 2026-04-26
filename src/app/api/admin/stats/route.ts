import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET() {
  const session = await auth();

  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      totalUsers,
      totalProblems,
      totalSubmissions,
      totalDuels,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      submissionsToday,
      submissionsThisWeek,
      submissionsThisMonth,
      duelsThisWeek,
      recentUsers,
      topUsersByXP,
      submissionsByVerdict,
      onlineNow,
      dailySubmissions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.problem.count(),
      prisma.submission.count(),
      prisma.duel.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.submission.count({ where: { createdAt: { gte: today } } }),
      prisma.submission.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.submission.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.duel.count({ where: { startedAt: { gte: weekAgo } } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, email: true, cfHandle: true, xp: true, level: true, createdAt: true, image: true },
      }),
      prisma.user.findMany({
        orderBy: { xp: "desc" },
        take: 10,
        select: { id: true, name: true, cfHandle: true, xp: true, level: true, cfRating: true, image: true },
      }),
      prisma.submission.groupBy({
        by: ["verdict"],
        _count: { verdict: true },
        orderBy: { _count: { verdict: "desc" } },
      }),
      prisma.user.count({
        where: { lastSeen: { gte: new Date(now.getTime() - 5 * 60 * 1000) } },
      }),
      // Last 14 days of submission counts
      prisma.$queryRawUnsafe<{ date: string; count: bigint }[]>(
        `SELECT DATE("createdAt") as date, COUNT(*)::int as count
         FROM "Submission"
         WHERE "createdAt" >= $1
         GROUP BY DATE("createdAt")
         ORDER BY date ASC`,
        weekAgo
      ),
    ]);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalProblems,
        totalSubmissions,
        totalDuels,
        onlineNow,
      },
      growth: {
        usersToday,
        usersThisWeek,
        usersThisMonth,
        submissionsToday,
        submissionsThisWeek,
        submissionsThisMonth,
        duelsThisWeek,
      },
      recentUsers,
      topUsersByXP,
      submissionsByVerdict: submissionsByVerdict.map(v => ({
        verdict: v.verdict,
        count: v._count.verdict,
      })),
      dailySubmissions: (dailySubmissions || []).map((d: any) => ({
        date: d.date,
        count: Number(d.count),
      })),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
