import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFSubmissions } from "@/lib/cf-api"
import { NextRequest } from "next/server"
import { recomputeTopicScore } from "@/lib/strength"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || !user.cfHandle) {
      return Response.json({ error: "No Codeforces handle connected" }, { status: 400 });
    }

    // Check if synced recently (e.g., within 5 mins) to prevent spam
    if (user.cfLastSync) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (user.cfLastSync > fiveMinsAgo) {
        return Response.json({ error: "Please wait 5 minutes between manual syncs." }, { status: 429 });
      }
    }

    // Fetch recent submissions
    const submissions = await getCFSubmissions(user.cfHandle, 1, 100);
    let imported = 0;
    const tagsToRecompute = new Set<string>();

    for (const sub of submissions) {
      if (!sub.problem.rating) continue;
      const subDate = new Date(sub.creationTimeSeconds * 1000);
      if (user.cfLastSync && subDate <= user.cfLastSync) continue;

      const cfId = `${sub.problem.contestId}${sub.problem.index}`;

      let problem = await prisma.problem.findUnique({ where: { cfId } });
      if (!problem) {
        problem = await prisma.problem.create({
          data: {
            cfId,
            cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
            title: sub.problem.name,
            rating: sub.problem.rating,
            contestId: sub.problem.contestId,
          },
        });
      }

      // Process tags
      const tags = sub.problem.tags || [];
      for (const tagName of tags) {
        let tag = await prisma.tag.findUnique({ where: { name: tagName } });
        if (!tag) {
          tag = await prisma.tag.create({ data: { name: tagName, category: "general" } });
        }
        tagsToRecompute.add(tag.id);

        await prisma.problemTag.upsert({
          where: { problemId_tagId: { problemId: problem.id, tagId: tag.id } },
          create: { problemId: problem.id, tagId: tag.id },
          update: {},
        });
      }

      // Upsert submission
      const existing = await prisma.submission.findUnique({
        where: { cfSubmissionId: String(sub.id) },
      });
      if (existing) continue;

      await prisma.submission.create({
        data: {
          userId: user.id,
          cfSubmissionId: String(sub.id),
          problemId: problem.id,
          verdict: sub.verdict,
          language: sub.programmingLanguage,
          timeMs: sub.timeConsumedMillis,
          memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
          submittedAt: subDate,
        },
      });

      imported++;
    }

    // Recompute topic scores for modified tags
    for (const tagId of Array.from(tagsToRecompute)) {
      await recomputeTopicScore(user.id, tagId);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { cfLastSync: new Date() }
    });

    return Response.json({ message: "Sync complete", imported });
  } catch (error) {
    console.error("POST /api/user/cf-handle/sync error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
