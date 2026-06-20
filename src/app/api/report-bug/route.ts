import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const bugReportSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  steps: z.string().max(3000).optional().default(""),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = bugReportSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { title, description, steps, priority } = parsed.data

    const bugReport = await prisma.bugReport.create({
      data: {
        userId: session.user.id,
        title,
        description,
        steps: steps || null,
        priority,
      },
    })

    return Response.json({ success: true, id: bugReport.id }, { status: 201 })
  } catch (error) {
    console.error("POST /api/report-bug error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
