import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const review = await prisma.weeklyReview.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!review) {
      return Response.json({ review: null, message: "No weekly review yet" });
    }

    return Response.json({ review });
  } catch (error) {
    console.error("GET /api/weekly-review error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* POST — Generate weekly review and optionally send email (#15) */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Calculate stats for the past 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [solvedThisWeek, user] = await Promise.all([
      prisma.submission.count({
        where: { userId, verdict: "OK", submittedAt: { gte: weekAgo } },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, xp: true, level: true, streakCurrent: true, cfHandle: true },
      }),
    ]);

    // Get topic performance
    const topicScores = await prisma.topicScore.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      take: 5,
      include: { tag: true },
    });

    const bestTag = topicScores[0]?.tag?.name || null;
    const worstTag = topicScores.length > 1 ? topicScores[topicScores.length - 1]?.tag?.name || null : null;

    // Estimate XP earned
    const estimatedXP = solvedThisWeek * 100; // rough avg

    const review = await prisma.weeklyReview.create({
      data: {
        userId,
        weekStart: weekAgo,
        totalXp: estimatedXP,
        problemsSolved: solvedThisWeek,
        bestTag,
        worstTag,
        streakStatus: `${user?.streakCurrent || 0} days`,
        data: {
          solvedThisWeek,
          estimatedXP,
          level: user?.level || 1,
          streak: user?.streakCurrent || 0,
          topTopics: topicScores.map((ts) => ({ name: ts.tag?.name, score: ts.score })),
        },
      },
    });

    // Try to send email via Resend if configured
    let emailSent = false;
    if (process.env.RESEND_API_KEY && user?.email) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "CP Vertex <noreply@cpvertex.com>",
          to: user.email,
          subject: `Your Weekly CP Vertex Report — ${solvedThisWeek} Problems Solved!`,
          html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="font-size: 24px; font-weight: 800; color: #1e293b;">Weekly Training Report</h1>
              <p style="color: #64748b;">Hey ${user.name || user.cfHandle || "Coder"}, here's your CP Vertex recap for the past week.</p>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0;">
                <div style="text-align: center; padding: 16px; background: #f0f9ff; border-radius: 12px;">
                  <div style="font-size: 28px; font-weight: 800; color: #0366d6;">${solvedThisWeek}</div>
                  <div style="font-size: 12px; color: #64748b;">Problems Solved</div>
                </div>
                <div style="text-align: center; padding: 16px; background: #fffbeb; border-radius: 12px;">
                  <div style="font-size: 28px; font-weight: 800; color: #d97706;">~${estimatedXP}</div>
                  <div style="font-size: 12px; color: #64748b;">XP Earned</div>
                </div>
                <div style="text-align: center; padding: 16px; background: #f0fdf4; border-radius: 12px;">
                  <div style="font-size: 28px; font-weight: 800; color: #059669;">${user.streakCurrent || 0}</div>
                  <div style="font-size: 12px; color: #64748b;">Day Streak</div>
                </div>
              </div>
              ${bestTag ? `<p style="color: #64748b;">Your strongest topic this week: <strong>${bestTag}</strong></p>` : ""}
              ${worstTag ? `<p style="color: #64748b;">Consider practicing: <strong>${worstTag}</strong></p>` : ""}
              <p style="color: #64748b;">Keep training hard. See you on the leaderboard!</p>
              <a href="https://cpvertex.com/dashboard" style="display: inline-block; padding: 12px 24px; background: #0366d6; color: white; text-decoration: none; border-radius: 8px; font-weight: 700;">Open Dashboard</a>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send weekly email:", emailError);
      }
    }

    return Response.json({ review, emailSent });
  } catch (error) {
    console.error("POST /api/weekly-review error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
