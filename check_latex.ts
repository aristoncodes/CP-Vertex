import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const articles = await prisma.algorithmArticle.findMany({ select: { slug: true, content: true } })
  console.log(`Checking ${articles.length} articles...`)
  let exposed = 0
  for (const a of articles) {
    if (a.content.includes("\\[") || a.content.includes("\\(")) {
      console.log(`${a.slug} uses \\[ or \\(`)
      exposed++
    }
  }
  console.log(`Exposed: ${exposed}`)
}
main()
