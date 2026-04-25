import { prisma } from "./src/lib/prisma";
import { fetchAllSubmissions } from "./src/lib/cf-api";

async function main() {
  const users = await prisma.user.findMany({
    where: { cfVerified: true }
  });
  
  for (const user of users) {
    if (!user.cfHandle) continue;
    console.log("Fetching all submissions for", user.cfHandle);
    
    const submissions = await fetchAllSubmissions(user.cfHandle);
    console.log(`Fetched ${submissions.length} submissions from CF`);
    
    const existingSubs = await prisma.submission.findMany({
      where: { userId: user.id },
      select: { cfSubmissionId: true }
    });
    const existingSet = new Set(existingSubs.map(s => s.cfSubmissionId));
    
    const missingSubs = submissions.filter(s => !existingSet.has(String(s.id)));
    console.log(`Found ${missingSubs.length} missing submissions`);
    
    if (missingSubs.length === 0) continue;
    
    // Group problems to ensure they exist
    const problemsNeeded = new Map();
    for (const sub of missingSubs) {
      const cfId = `${sub.problem.contestId}${sub.problem.index}`;
      if (!problemsNeeded.has(cfId)) {
        problemsNeeded.set(cfId, {
          cfId,
          cfLink: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`,
          title: sub.problem.name,
          rating: sub.problem.rating || 0,
          contestId: sub.problem.contestId,
        });
      }
    }
    
    // Insert missing problems
    for (const prob of problemsNeeded.values()) {
      await prisma.problem.upsert({
        where: { cfId: prob.cfId },
        create: prob,
        update: {}
      });
    }
    
    // Fetch all problem IDs
    const allProblems = await prisma.problem.findMany({
      where: { cfId: { in: Array.from(problemsNeeded.keys()) } },
      select: { id: true, cfId: true }
    });
    const probMap = new Map(allProblems.map(p => [p.cfId, p.id]));
    
    // Create submissions
    const subData = missingSubs.map(sub => {
      const cfId = `${sub.problem.contestId}${sub.problem.index}`;
      return {
        userId: user.id,
        cfSubmissionId: String(sub.id),
        problemId: probMap.get(cfId)!,
        verdict: sub.verdict,
        language: sub.programmingLanguage,
        timeMs: sub.timeConsumedMillis,
        memoryKb: Math.round(sub.memoryConsumedBytes / 1024),
        submittedAt: new Date(sub.creationTimeSeconds * 1000),
      };
    }).filter(s => s.problemId);
    
    if (subData.length > 0) {
      await prisma.submission.createMany({
        data: subData,
        skipDuplicates: true
      });
      console.log(`Imported ${subData.length} missing submissions for ${user.cfHandle}`);
    }
    
    // Recalculate unique
    const uniqueSolved = await prisma.submission.findMany({
      where: { userId: user.id, verdict: "OK" },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    console.log(`Total Unique Solved for ${user.cfHandle}: ${uniqueSolved.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
