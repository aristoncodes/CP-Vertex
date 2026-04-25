import { prisma } from "./src/lib/prisma";
import { getLevelFromXP } from "./src/lib/xp-math";

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    const computedLevel = getLevelFromXP(user.xp);
    if (user.level !== computedLevel) {
      await prisma.user.update({
        where: { id: user.id },
        data: { level: computedLevel }
      });
      console.log(`Updated user ${user.cfHandle || user.name}: Level ${user.level} -> ${computedLevel}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
