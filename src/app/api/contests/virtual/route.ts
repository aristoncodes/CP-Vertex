import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimits, checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkRateLimit(rateLimits.api, session.user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const contestId = body.contestId;

    if (!contestId) {
      return Response.json({ error: "Contest ID is required" }, { status: 400 });
    }

    // Check if user already has an active session
    const activeSession = await prisma.virtualContest.findFirst({
      where: { userId: session.user.id, status: "active" },
    });

    if (activeSession) {
      return Response.json({ error: "You already have an active virtual contest. Finish it first!" }, { status: 400 });
    }

    // Fetch contest duration from CF
    const listRes = await fetch("https://codeforces.com/api/contest.list?gym=false");
    const listData = await listRes.json();
    if (listData.status !== "OK") throw new Error("Failed to fetch contest list");

    const contest = listData.result.find((c: any) => c.id === contestId);
    if (!contest) {
      return Response.json({ error: "Contest not found on Codeforces" }, { status: 404 });
    }

    // Create session (2 hours default if duration not found, though CF returns durationSeconds)
    const duration = contest.durationSeconds || 7200;

    const newSession = await prisma.virtualContest.create({
      data: {
        userId: session.user.id,
        contestId,
        duration,
        status: "active",
      },
    });

    return Response.json({ session: newSession });
  } catch (error) {
    console.error("POST /api/contests/virtual error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkRateLimit(rateLimits.api, session.user.id);
    if (rateLimited) return rateLimited;

    const activeSession = await prisma.virtualContest.findFirst({
      where: { userId: session.user.id, status: "active" },
    });

    if (!activeSession) {
      return Response.json({ active: false });
    }

    // Fetch problems for this contest
    const standingRes = await fetch(`https://codeforces.com/api/contest.standings?contestId=${activeSession.contestId}&from=1&count=1`);
    const standingData = await standingRes.json();

    if (standingData.status !== "OK") {
      throw new Error("Failed to fetch contest standings");
    }

    const problems = standingData.result.problems.map((p: any) => ({
      index: p.index,
      name: p.name,
      rating: p.rating || "N/A",
      tags: p.tags,
      cfLink: `https://codeforces.com/contest/${activeSession.contestId}/problem/${p.index}`,
    }));

    return Response.json({
      active: true,
      session: activeSession,
      contest: standingData.result.contest,
      problems,
    });
  } catch (error) {
    console.error("GET /api/contests/virtual error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
