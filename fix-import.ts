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
    let newImports = 0;
    
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
      }
      
      const existing = await prisma.submission.findUnique({
        where: { cfSubmissionId: String(sub.id) }
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
          }
        });
        newImports++;
      }
    }
    console.log(`Imported ${newImports} missing submissions for ${user.cfHandle}`);
    
    // Recalculate distinct problems solved
    const uniqueSolved = await prisma.submission.findMany({
      where: { userId: user.id, verdict: "OK" },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    console.log(`Total Unique Solved for ${user.cfHandle}: ${uniqueSolved.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
