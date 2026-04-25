import { PrismaClient } from "./src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

prisma.problem.count().then(c => {
  console.log("Total problems:", c)
  process.exit(0)
}).catch(console.error)
