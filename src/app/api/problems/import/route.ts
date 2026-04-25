import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getCFProblems } from "@/lib/cf-api"

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { problems, problemStatistics } = await getCFProblems()

    // Build a solvedCount lookup
    const statsMap = new Map<string, number>()
    for (const s of problemStatistics) {
      statsMap.set(`${s.contestId}${s.index}`, s.solvedCount)
    }

    let imported = 0
    let skipped = 0

    // Process in batches of 100
    const batch: {
      cfId: string
      cfLink: string
      title: string
      rating: number
      solvedCount: number
      contestId: number | null
      tags: string[]
    }[] = []

    for (const p of problems) {
      if (!p.rating || !p.contestId) {
        skipped++
        continue
      }

      const cfId = `${p.contestId}${p.index}`
      batch.push({
        cfId,
        cfLink: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
        title: p.name,
        rating: p.rating,
        solvedCount: statsMap.get(cfId) || 0,
        contestId: p.contestId,
        tags: p.tags,
      })
    }

    // Upsert problems in chunks
    const chunkSize = 50
    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize)

      for (const item of chunk) {
        try {
          await prisma.problem.upsert({
            where: { cfId: item.cfId },
            create: {
              cfId: item.cfId,
              cfLink: item.cfLink,
              title: item.title,
              rating: item.rating,
              solvedCount: item.solvedCount,
              contestId: item.contestId,
            },
            update: {
              title: item.title,
              rating: item.rating,
              solvedCount: item.solvedCount,
            },
          })

          // Upsert tags
          for (const tagName of item.tags) {
            const tag = await prisma.tag.upsert({
              where: { name: tagName },
              create: { name: tagName, category: "topic" },
              update: {},
            })

            await prisma.problemTag.upsert({
              where: {
                problemId_tagId: {
                  problemId: (await prisma.problem.findUnique({ where: { cfId: item.cfId } }))!.id,
                  tagId: tag.id,
                },
              },
              create: {
                problemId: (await prisma.problem.findUnique({ where: { cfId: item.cfId } }))!.id,
                tagId: tag.id,
              },
              update: {},
            })
          }

          imported++
        } catch (e) {
          // Skip duplicates or constraint errors silently
          skipped++
        }
      }
    }

    return Response.json({
      message: "Import complete",
      imported,
      skipped,
      total: problems.length,
    })
  } catch (error) {
    console.error("POST /api/problems/import error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
