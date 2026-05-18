import { PrismaClient } from "./src/generated/prisma/client";
const prisma = new PrismaClient();

async function test() {
  const userId = (await prisma.user.findFirst())?.id;
  if (!userId) return console.log("No user found");
  
  const today = new Date().toISOString().split("T")[0];
  const todayDate = new Date(today);
  
  let userMissions = await prisma.userMission.findMany({
    where: { userId, date: todayDate },
    include: { mission: true },
  });
  console.log("Found userMissions:", userMissions.length);
  
  let missionTemplates = await prisma.mission.findMany();
  console.log("Found templates:", missionTemplates.length);
  
  if (userMissions.length === 0) {
      if (missionTemplates.length === 0) {
        await prisma.mission.createMany({
          data: [
            { type: "solve_tag", title: "Solve 2 Binary Search problems", description: "WEAK ZONE · 42% AC RATE", xpReward: 100, difficulty: "normal" },
            { type: "boss_fight", title: "Defeat Boss: 'Cthulhu'", description: "ARENA EVENT", xpReward: 250, difficulty: "hard" },
            { type: "duel_win", title: "Win 1 Duel", description: "PVP CHALLENGE", xpReward: 150, difficulty: "normal" }
          ]
        })
        missionTemplates = await prisma.mission.findMany()
      }
      
      const shuffled = missionTemplates.sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, Math.min(3, shuffled.length))

      try {
        userMissions = await Promise.all(
          selected.map((m) =>
            prisma.userMission.create({
              data: {
                userId,
                missionId: m.id,
                date: todayDate,
                target: 1,
              },
              include: { mission: true },
            })
          )
        )
        console.log("Created missions:", userMissions.length);
      } catch (e) {
        console.error("CREATE ERROR:", e);
      }
  }
}
test().catch(console.error).finally(() => prisma.$disconnect());
