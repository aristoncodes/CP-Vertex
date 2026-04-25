import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cfId: string }> }
) {
  try {
    const { cfId } = await params

    const problem = await prisma.problem.findUnique({
      where: { cfId },
      include: {
        tags: { include: { tag: true } },
      },
    })

    if (!problem) {
      return Response.json({ error: "Problem not found" }, { status: 404 })
    }

    // Check if user has submissions for this problem
    let userStatus = null
    const session = await auth()
    if (session?.user?.id) {
      const submissions = await prisma.submission.findMany({
        where: { userId: session.user.id, problemId: problem.id },
        orderBy: { submittedAt: "desc" },
        take: 10,
        select: {
          verdict: true,
          submittedAt: true,
          language: true,
        },
      })

      const hasAC = submissions.some((s) => s.verdict === "OK")
      userStatus = {
        attempted: submissions.length > 0,
        solved: hasAC,
        submissions: submissions,
      }
    }

    return Response.json({
      id: problem.id,
      cfId: problem.cfId,
      cfLink: problem.cfLink,
      title: problem.title,
      rating: problem.rating,
      solvedCount: problem.solvedCount,
      tags: problem.tags.map((pt) => pt.tag.name),
      userStatus,
    })
  } catch (error) {
    console.error("GET /api/problems/[cfId] error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
