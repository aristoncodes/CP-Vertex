import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET() {
  const session = await auth();

  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalBugs,
      openBugs,
      inProgressBugs,
      resolvedBugs,
      bugsThisWeek,
      criticalBugs,
      highBugs,
      recentBugs,
      bugsByPriority,
    ] = await Promise.all([
      prisma.bugReport.count(),
      prisma.bugReport.count({ where: { status: "open" } }),
      prisma.bugReport.count({ where: { status: "in_progress" } }),
      prisma.bugReport.count({ where: { status: { in: ["resolved", "closed"] } } }),
      prisma.bugReport.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.bugReport.count({ where: { priority: "Critical", status: { in: ["open", "in_progress"] } } }),
      prisma.bugReport.count({ where: { priority: "High", status: { in: ["open", "in_progress"] } } }),
      prisma.bugReport.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: { id: true, name: true, email: true, cfHandle: true, image: true },
          },
        },
      }),
      prisma.bugReport.groupBy({
        by: ["priority"],
        _count: { priority: true },
        orderBy: { _count: { priority: "desc" } },
      }),
    ]);

    return NextResponse.json({
      overview: {
        totalBugs,
        openBugs,
        inProgressBugs,
        resolvedBugs,
        bugsThisWeek,
        criticalBugs,
        highBugs,
      },
      recentBugs,
      bugsByPriority: bugsByPriority.map(b => ({
        priority: b.priority,
        count: b._count.priority,
      })),
    });
  } catch (error) {
    console.error("Admin bug-reports stats error:", error);
    return NextResponse.json({ error: "Failed to fetch bug reports" }, { status: 500 });
  }
}

const updateBugSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  adminNotes: z.string().max(2000).optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();

  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateBugSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { id, status, adminNotes } = parsed.data;

    const updateData: Record<string, string> = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const updated = await prisma.bugReport.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, bugReport: updated });
  } catch (error) {
    console.error("PATCH /api/admin/bug-reports error:", error);
    return NextResponse.json({ error: "Failed to update bug report" }, { status: 500 });
  }
}
