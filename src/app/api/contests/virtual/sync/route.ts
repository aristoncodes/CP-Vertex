import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimits, checkRateLimit } from "@/lib/ratelimit";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimited = await checkRateLimit(rateLimits.cfConnect, session.user.id);
    if (rateLimited) return rateLimited;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfHandle: true, xp: true },
    });

    if (!user?.cfHandle) {
      return Response.json({ error: "No CF handle" }, { status: 400 });
    }

    const activeSession = await prisma.virtualContest.findFirst({
      where: { userId: session.user.id, status: "active" },
    });

    if (!activeSession) {
      return Response.json({ error: "No active session" }, { status: 404 });
    }

    const now = new Date();
    const startTime = new Date(activeSession.startTime);
    const endTime = new Date(startTime.getTime() + activeSession.duration * 1000);
    const isExpired = now >= endTime;

    // Fetch user.status from CF
    const statusRes = await fetch(`https://codeforces.com/api/user.status?handle=${user.cfHandle}&from=1&count=50`);
    const statusData = await statusRes.json();
    
    if (statusData.status !== "OK") {
      throw new Error("Failed to fetch user status");
    }

    // Filter submissions inside the contest window
    const validSubmissions = statusData.result.filter((sub: any) => {
      const subTime = new Date(sub.creationTimeSeconds * 1000);
      return (
        sub.contestId === activeSession.contestId &&
        sub.verdict === "OK" &&
        subTime >= startTime &&
        subTime <= endTime
      );
    });

    // Deduplicate by problem index
    const solvedIndices = new Set<string>();
    validSubmissions.forEach((sub: any) => solvedIndices.add(sub.problem.index));

    const problemsSolved = solvedIndices.size;

    if (isExpired) {
      // Calculate XP (100 per problem)
      const xpAwarded = problemsSolved * 100;
      // Faux Rating change calculation (-30 for 0, +10 for each problem solved)
      const fauxRatingChange = -30 + (problemsSolved * 20); 

      await prisma.$transaction([
        prisma.virtualContest.update({
          where: { id: activeSession.id },
          data: {
            status: "completed",
            score: problemsSolved,
            xpAwarded: xpAwarded,
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { xp: { increment: xpAwarded } },
        })
      ]);

      return Response.json({
        synced: true,
        completed: true,
        problemsSolved,
        xpAwarded,
        fauxRatingChange,
        solvedIndices: Array.from(solvedIndices),
      });
    }

    // Still active
    return Response.json({
      synced: true,
      completed: false,
      problemsSolved,
      solvedIndices: Array.from(solvedIndices),
    });

  } catch (error) {
    console.error("POST /api/contests/virtual/sync error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
