import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getUserContestSettings } from "@/lib/upsolve"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await getUserContestSettings(session.user.id)
  return NextResponse.json({ settings })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { div1Target, div2Target, div3Target, div4Target, autoAdjust } = body

  const data: Record<string, unknown> = {}
  if (div1Target !== undefined) data.div1Target = div1Target
  if (div2Target !== undefined) data.div2Target = div2Target
  if (div3Target !== undefined) data.div3Target = div3Target
  if (div4Target !== undefined) data.div4Target = div4Target
  if (autoAdjust !== undefined) data.autoAdjust = autoAdjust

  const settings = await prisma.userContestSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...data,
    },
    update: data,
  })

  return NextResponse.json({ settings })
}
