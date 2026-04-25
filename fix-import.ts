import { prisma } from "./src/lib/prisma";
import { fetchAllSubmissions } from "./src/lib/cf-api";

async function main() {
  const users = await prisma.user.findMany({
    where: { cfVerified: true }
  });
  
  for (const user of users) {
    if (!user.cfHandle) continue;
    console.log("Fetching all submissions for", user.cfHandle);
    
    try {
      const submissions = await fetchAllSubmissions(user.cfHandle);
      let newProblems = 0;
      let newSubmissions = 0;
      
      const tagsToRecompute = new Set<string>();

      for (const sub of submissions) {
        const cfId = `${sub.problem.contestId}${sub.problem.index}`;

        let problem = await prisma.problem.findUnique({ where: { cfId } });
        if (!problem) {
          problem = await prisma.problem.create({
            data: {
              cfId,
              cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
              title: sub.problem.name,
              rating: sub.problem.rating || 0,
              contestId: sub.problem.contestId,
            },
          });
          newProblems++;
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
        if (!existing) {
          await prisma.submission.create({
            data: {
              userId: user.id,
              cfSubmissionId: String(sub.id),
              problemId: problem.id,
              verdict: sub.verdict,
              language: sub.programmingLanguage,
              timeMs: sub.timeConsumedMillis,
              memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
              submittedAt: new Date(sub.creationTimeSeconds * 1000),
              xpAwarded: 0,
            },
          });
          newSubmissions++;
        }
      }
      
      console.log(`User ${user.cfHandle}: added ${newProblems} missing problems, ${newSubmissions} missing submissions.`);
      
    } catch (err) {
      console.error("Failed for", user.cfHandle, err);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
