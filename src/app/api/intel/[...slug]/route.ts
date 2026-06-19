import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const resolvedParams = await params
  const fullSlug = resolvedParams.slug.join('/')
  
  const article = await prisma.algorithmArticle.findUnique({
    where: { slug: fullSlug },
    include: { problems: true }
  })
  
  if (!article) return new Response('Not found', { status: 404 })
  return Response.json(article)
}
