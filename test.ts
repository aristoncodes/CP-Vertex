import { PrismaClient } from "./src/generated/prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { cfHandle: { not: null } } });
  console.log(users[0]?.cfHandle);
  const missions = await prisma.userMission.findMany({ orderBy: { id: "desc" }, take: 5, include: { mission: true } });
  console.log(JSON.stringify(missions, null, 2));
}
main();
