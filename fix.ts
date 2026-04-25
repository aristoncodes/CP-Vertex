import { prisma } from "./src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    where: { cfVerified: true }
  });
  
  for (const user of users) {
    if (!user.cfHandle) continue;
    console.log("Fixing user streak", user.cfHandle);
    
    const submissions = await prisma.submission.findMany({
      where: { userId: user.id, verdict: "OK" },
      select: { submittedAt: true }
    });
    
    const uniqueDates = Array.from(new Set(
      submissions.map(s => s.submittedAt.toISOString().split("T")[0])
    )).sort((a, b) => b.localeCompare(a));
    
    let currentStreak = 0;
    let lastActiveDay: Date | null = null;
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Calculate Longest Streak
    for (let i = 0; i < uniqueDates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const d1 = new Date(uniqueDates[i-1]);
            const d2 = new Date(uniqueDates[i]);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }
        }
        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
        }
    }

    const todayDate = new Date();
    const today = todayDate.toISOString().split("T")[0];
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];
    
    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
      let checkDate = uniqueDates.includes(today) ? new Date() : yesterdayDate;
      lastActiveDay = new Date(checkDate);
      while (true) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (uniqueDates.includes(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        streakCurrent: currentStreak,
        streakLongest: Math.max(user.streakLongest || 0, longestStreak),
        ...(lastActiveDay ? { streakLastDay: lastActiveDay } : {})
      }
    });
    console.log(`Updated ${user.cfHandle}: Streak=${currentStreak}, Longest=${longestStreak}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
