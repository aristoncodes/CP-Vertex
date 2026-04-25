import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function test() {
  console.log("Connecting...");
  const start = Date.now();
  try {
    const user = await prisma.user.findFirst();
    console.log("Connected! Took", Date.now() - start, "ms");
  } catch(e) {
    console.error("Error", e);
  } finally {
    await prisma.$disconnect()
  }
}
test()
