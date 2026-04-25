import { prisma } from "./src/lib/prisma";
import { calculateXP, getLevelFromXP } from "./src/lib/xp";

async function main() {
  const users = await prisma.user.findMany({
    where: { cfVerified: true }
  });
  
  for (const user of users) {
    if (!user.cfHandle) continue;
    console.log("Fixing user XP and level for", user.cfHandle);
    
    const submissions = await prisma.submission.findMany({
      where: { userId: user.id, verdict: "OK" },
      include: { problem: true },
      orderBy: { submittedAt: "asc" }
    });
    
    // We need to simulate chronological XP gain so levelDecay works correctly
    let currentXP = 0;
    let currentLevel = 1;
    
    for (const sub of submissions) {
        // Just standard baseline for old problems
        const isClean = true; 
        const isWeakTag = false;
        
        const problemRating = sub.problem.rating || 800; // default 800 for unrated
        
        const xpEarned = calculateXP(problemRating, currentLevel, isClean, isWeakTag);
        currentXP += xpEarned;
        currentLevel = getLevelFromXP(currentXP);
        
        // Update submission so it reflects the awarded XP
        if (sub.xpAwarded === 0) {
            await prisma.submission.update({
                where: { id: sub.id },
                data: { xpAwarded: xpEarned }
            });
        }
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: currentXP,
        level: currentLevel
      }
    });
    console.log(`Updated ${user.cfHandle}: XP=${currentXP}, Level=${currentLevel}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
