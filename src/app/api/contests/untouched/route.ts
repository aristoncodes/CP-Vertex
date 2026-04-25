import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { cfHandle: true },
    });

    if (!user?.cfHandle) {
      return Response.json({ error: "No Codeforces handle linked" }, { status: 400 });
    }

    // 1. Fetch all CF contests
    const listRes = await fetch("https://codeforces.com/api/contest.list?gym=false");
    const listData = await listRes.json();
    if (listData.status !== "OK") {
      throw new Error("Failed to fetch contest list");
    }

    // 2. Fetch user's rating history to see official participation
    const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${user.cfHandle}`);
    const ratingData = await ratingRes.json();
    
    // We treat missing rating data as "never participated in anything" instead of throwing error
    const participatedSet = new Set<number>();
    if (ratingData.status === "OK") {
      ratingData.result.forEach((r: any) => {
        participatedSet.add(r.contestId);
      });
    }

    // 3. We also check local database for any virtual sessions already done or active
    const localSessions = await prisma.virtualContest.findMany({
      where: { userId: session.user.id },
      select: { contestId: true },
    });
    localSessions.forEach((s) => participatedSet.add(s.contestId));

    // 4. Filter
    const upcoming = listData.result
      .filter((c: any) => c.phase === "BEFORE")
      .reverse(); // usually the API returns them chronologically reversed, so reverse to show nearest first

    const available = listData.result
      .filter((c: any) => c.phase === "FINISHED")
      .filter((c: any) => !participatedSet.has(c.id))
      .slice(0, 50); // Get latest 50 untouched contests

    return Response.json({ upcoming, contests: available });
  } catch (error: any) {
    console.error("GET /api/contests/untouched error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
