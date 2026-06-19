import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const articles = await prisma.algorithmArticle.findMany({
    select: { 
      slug: true, 
      title: true, 
      category: true, 
      subcategory: true, 
      difficulty: true, 
      tags: true,
      problems: {
        select: { id: true }
      }
    }
  })
  
  // We attach problem count for the frontend stats
  const formattedArticles = articles.map(a => ({
    ...a,
    problemCount: a.problems.length
  }))
  
  return Response.json(formattedArticles)
}
