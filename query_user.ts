import { prisma } from './src/lib/prisma';
async function main() {
  const user = await prisma.user.findFirst({ where: { cfHandle: "joyboy24" } });
  console.log("User createdAt:", user?.createdAt);
  
  const participations = await prisma.contestParticipation.findMany({ where: { userId: user?.id } });
  console.log("Participations:", participations);
  
  const items = await prisma.upsolveItem.findMany({ where: { userId: user?.id } });
  console.log("Upsolve Items:", items.length);
}
main().finally(() => prisma.$disconnect());
