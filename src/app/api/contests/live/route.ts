import { NextResponse } from "next/server";

interface CFContest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds?: number;
}

/**
 * GET /api/contests/live — Fetch upcoming/running contests from Codeforces API
 * Implements #12: Live Contest Calendar
 */
export async function GET() {
  try {
    const res = await fetch("https://codeforces.com/api/contest.list?gym=false", {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch from Codeforces" }, { status: 502 });
    }

    const data = await res.json();
    if (data.status !== "OK") {
      return NextResponse.json({ error: "CF API error" }, { status: 502 });
    }

    const contests: CFContest[] = data.result || [];

    // Upcoming or running contests (phase = BEFORE or CODING)
    const upcoming = contests
      .filter((c: CFContest) => c.phase === "BEFORE" || c.phase === "CODING")
      .sort((a: CFContest, b: CFContest) => a.startTimeSeconds - b.startTimeSeconds)
      .slice(0, 15)
      .map((c: CFContest) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        phase: c.phase,
        durationSeconds: c.durationSeconds,
        startTimeSeconds: c.startTimeSeconds,
        startDate: new Date(c.startTimeSeconds * 1000).toISOString(),
        isRunning: c.phase === "CODING",
      }));

    // Recent finished contests (for virtual participation)
    const recent = contests
      .filter((c: CFContest) => c.phase === "FINISHED")
      .sort((a: CFContest, b: CFContest) => b.startTimeSeconds - a.startTimeSeconds)
      .slice(0, 10)
      .map((c: CFContest) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        durationSeconds: c.durationSeconds,
        startTimeSeconds: c.startTimeSeconds,
        startDate: new Date(c.startTimeSeconds * 1000).toISOString(),
      }));

    return NextResponse.json({ upcoming, recent });
  } catch (error) {
    console.error("GET /api/contests/live error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
