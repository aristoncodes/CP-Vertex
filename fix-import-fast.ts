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
      
      const cfIds = submissions.map(s => `${s.problem.contestId}${s.problem.index}`);
      
      // Batch find problems
      const existingProblems = await prisma.problem.findMany({
        where: { cfId: { in: cfIds } },
        select: { cfId: true, id: true }
      });
      const existingProblemCfIds = new Set(existingProblems.map(p => p.cfId));
      
      // Batch create missing problems
      const missingProblemsData = [];
      const seenMissing = new Set<string>();
      for (const sub of submissions) {
        const cfId = `${sub.problem.contestId}${sub.problem.index}`;
        if (!existingProblemCfIds.has(cfId) && !seenMissing.has(cfId)) {
          seenMissing.add(cfId);
          missingProblemsData.push({
            cfId,
            cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
            title: sub.problem.name,
            rating: sub.problem.rating || 0,
            contestId: sub.problem.contestId,
          });
        }
      }
      
      if (missingProblemsData.length > 0) {
        await prisma.problem.createMany({
          data: missingProblemsData,
          skipDuplicates: true
        });
        console.log(`Created ${missingProblemsData.length} missing problems`);
      }
      
      // Re-fetch all problem IDs mapping
      const allProblems = await prisma.problem.findMany({
        where: { cfId: { in: cfIds } },
        select: { cfId: true, id: true }
      });
      const problemIdMap = new Map(allProblems.map(p => [p.cfId, p.id]));
      
      // Create missing submissions
      const submissionsData = [];
      const seenSubs = new Set<string>();
      for (const sub of submissions) {
        const cfId = `${sub.problem.contestId}${sub.problem.index}`;
        const problemId = problemIdMap.get(cfId);
        if (problemId && !seenSubs.has(String(sub.id))) {
          seenSubs.add(String(sub.id));
          submissionsData.push({
            userId: user.id,
            cfSubmissionId: String(sub.id),
            problemId: problemId,
            verdict: sub.verdict,
            language: sub.programmingLanguage,
            timeMs: sub.timeConsumedMillis,
            memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
            submittedAt: new Date(sub.creationTimeSeconds * 1000),
            xpAwarded: 0,
          });
        }
      }
      
      if (submissionsData.length > 0) {
        const res = await prisma.submission.createMany({
          data: submissionsData,
          skipDuplicates: true
        });
        console.log(`User ${user.cfHandle}: inserted ${res.count} new submissions.`);
      }
      
    } catch (err) {
      console.error("Failed for", user.cfHandle, err);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
