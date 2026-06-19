import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { analyzeContest } from "@/lib/intelligence"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: participationId } = await params


    // Check if participation exists and belongs to user
    const participation = await prisma.contestParticipation.findUnique({
      where: { id: participationId },
    })

    if (!participation || participation.userId !== session.user.id) {
      return Response.json({ error: "Contest not found" }, { status: 404 })
    }

    // Check if it already has an analysis
    if (participation.aiAnalysis) {
      return Response.json({ analysis: JSON.parse(participation.aiAnalysis) })
    }

    const analysis = await analyzeContest(session.user.id, participationId)
    if (!analysis) {
      return Response.json({ error: "Analysis failed to generate" }, { status: 500 })
    }

    return Response.json({ analysis })
  } catch (error) {
    console.error("POST /api/postmortems/contest/[id] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
