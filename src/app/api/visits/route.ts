import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const redis = getRedis();
    
    // Check if user has already visited recently
    const hasVisited = request.cookies.get("cp_vertex_visited");
    
    let visits: number;
    if (!hasVisited) {
      // Increment the global visit counter
      visits = await redis.incr("site_global_visits");
    } else {
      // Just fetch the current count
      visits = (await redis.get<number>("site_global_visits")) || 0;
    }

    const response = NextResponse.json({ visits });
    
    if (!hasVisited) {
      // Set cookie to avoid double counting on page navigation (expires in 1 hour)
      response.cookies.set("cp_vertex_visited", "true", { maxAge: 60 * 60, path: "/" });
    }
    
    return response;
  } catch (error) {
    console.error("GET /api/visits error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
