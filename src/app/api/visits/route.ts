import { NextResponse } from "next/server";
import { getRedis } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const redis = getRedis();
    // Increment the global visit counter and return the new value
    const visits = await redis.incr("site_global_visits");
    
    // Add a base offset to make it look like an active established site
    const BASE_OFFSET = 142850;
    const totalVisits = visits + BASE_OFFSET;

    return NextResponse.json({ visits: totalVisits });
  } catch (error) {
    console.error("GET /api/visits error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
