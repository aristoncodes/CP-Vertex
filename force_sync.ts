import { PrismaClient } from '@prisma/client';
import { getCFSubmissions, getCFRatingHistory } from './src/lib/cf-api';
import { detectDivisionFromName, detectUpsolveItems } from './src/lib/upsolve';
import { scheduleReminders } from './src/workers/upsolve-reminders';

const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst({ where: { cfHandle: "joyboy24" } });
  if (!user) return console.log("User not found");

  const allSubs = await getCFSubmissions(user.cfHandle, 1, 200);
  
  const contestGroups: Record<number, any[]> = {};
  for (const sub of allSubs) {
    if (!sub.contestId) continue;
    if (!contestGroups[sub.contestId]) contestGroups[sub.contestId] = [];
    contestGroups[sub.contestId].push(sub);
  }

  let ratingHistory: any[] = [];
  try { ratingHistory = await getCFRatingHistory(user.cfHandle); } catch {}

  for (const [cidStr, contestSubs] of Object.entries(contestGroups)) {
    const contestId = Number(cidStr);
    const isRated = contestSubs.some(s => s.author?.participantType === "CONTESTANT");
    if (!isRated) continue;

    const ratingEntry = ratingHistory.find(h => h.contestId === contestId);
    const contestEndTime = ratingEntry 
      ? new Date(ratingEntry.ratingUpdateTimeSeconds * 1000)
      : new Date(Math.max(...contestSubs.map(s => s.creationTimeSeconds)) * 1000);

    if (contestEndTime < user.createdAt) continue;

    const existing = await prisma.contestParticipation.findUnique({
      where: { userId_contestId: { userId: user.id, contestId } }
    });
    if (existing) { console.log(`Already has participation for ${contestId}`); continue; }

    const contestName = ratingEntry?.contestName ?? `Codeforces Round ${contestId}`;
    const division = detectDivisionFromName(contestName);
    const problemsSolved = contestSubs.filter(s => s.verdict === "OK").length;

    console.log(`Processing ${contestName}...`);

    let participation = await prisma.contestParticipation.create({
      data: {
        userId: user.id,
        contestId,
        contestName,
        division,
        ratingBefore: ratingEntry?.oldRating ?? null,
        ratingAfter: ratingEntry?.newRating ?? null,
        ratingChange: ratingEntry ? ratingEntry.newRating - ratingEntry.oldRating : null,
        rank: ratingEntry?.rank ?? null,
        problemsSolved,
        participatedAt: contestEndTime,
      }
    });

    const upsolveInputs = await detectUpsolveItems(
      user.id, contestId, contestName, contestEndTime, allSubs
    );

    console.log(`Generated ${upsolveInputs.length} upsolve items!`);

    for (const input of upsolveInputs) {
      const problem = await prisma.problem.findUnique({ where: { cfId: input.problemCfId } });
      if (!problem) continue;
      await prisma.upsolveItem.create({
        data: {
          userId: user.id,
          contestParticipationId: participation.id,
          problemId: problem.id,
          type: input.type,
          category: input.category,
          attemptCount: input.attemptCount,
          lastVerdict: input.lastVerdict,
          priority: input.priority,
          xpMultiplier: input.xpMultiplier,
          deadlineAt: input.deadlineAt,
        }
      });
    }
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
