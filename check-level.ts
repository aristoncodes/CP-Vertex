import { prisma } from "./src/lib/prisma";
async function main() {
  const users = await prisma.user.findMany({ select: { cfHandle: true, xp: true, level: true }});
  console.log(users);
}
main().finally(() => prisma.$disconnect());
