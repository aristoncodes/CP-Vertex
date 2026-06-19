import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const item = await prisma.upsolveItem.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (item.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const updated = await prisma.upsolveItem.update({
    where: { id },
    data: { status: "skipped" },
  })

  return NextResponse.json({ item: updated })
}
