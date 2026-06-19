import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateCoachInsight } from "@/lib/intelligence"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id;
    const insight = await generateCoachInsight(userId);

    if (!insight) {
      return Response.json({ error: "Failed to generate recommendation. You may need to sync your Codeforces data first." }, { status: 400 });
    }

    return Response.json({ message: "Recommendation generated", insight });
  } catch (error) {
    console.error("POST /api/user/insights/generate error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
