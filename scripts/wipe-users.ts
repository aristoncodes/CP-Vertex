import { config } from "dotenv";
config({ path: ".env" });
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🧹 Wiping all user data from the database...");

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "User" CASCADE;`);
  
  console.log(`✅ Successfully deleted all user-related data (CASCADE).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
