import { prisma } from './src/lib/prisma'
async function main() {
  console.log("Connecting...")
  const start = Date.now()
  const users = await prisma.user.count()
  console.log(`Connected! Users: ${users}. Took ${Date.now() - start}ms`)
}
main().catch(console.error).finally(() => prisma.$disconnect())
