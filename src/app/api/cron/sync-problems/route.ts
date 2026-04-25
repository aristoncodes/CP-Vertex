import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

const CF_BASE = "https://codeforces.com/api"

function categorizeTag(tag: string): string {
  if (["dp", "greedy", "binary search", "divide and conquer", "two pointers"].includes(tag)) return "algorithms"
  if (["graphs", "trees", "dfs and similar", "shortest paths"].includes(tag)) return "graphs"
  if (["data structures", "segment tree", "dsu"].includes(tag)) return "data structures"
  if (["strings", "string suffix structures"].includes(tag)) return "strings"
  if (["math", "number theory", "combinatorics", "geometry"].includes(tag)) return "math"
  return "advanced"
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("🌱 Syncing new Codeforces problems...")

    // 1. Get the highest contestId currently in the database
    const latestProblem = await prisma.problem.findFirst({
      orderBy: { contestId: 'desc' },
      select: { contestId: true }
    })

    const maxContestId = latestProblem?.contestId ?? 0

    // 2. Fetch all problems from Codeforces
    const res = await fetch(`${CF_BASE}/problemset.problems`)
    const data = await res.json()

    if (data.status !== "OK") {
      throw new Error(`CF API error: ${data.comment}`)
    }

    const allProblems = data.result.problems.filter((p: any) => p.rating != null)
    
    // 3. Filter only NEW problems (contestId > maxContestId)
    // We add a tiny buffer (maxContestId - 5) just in case CF added a late problem to an older contest
    const newProblems = allProblems.filter((p: any) => p.contestId > maxContestId - 5)

    if (newProblems.length === 0) {
      return Response.json({ message: "No new problems found", count: 0 })
    }

    console.log(`Found ${newProblems.length} potentially new problems.`)

    const stats = data.result.problemStatistics
    const statsMap = new Map(stats.map((s: any) => [`${s.contestId}${s.index}`, s.solvedCount]))

    // 4. Ensure all tags for the new problems exist
    const uniqueTags = new Set<string>()
    newProblems.forEach((p: any) => p.tags.forEach((t: string) => uniqueTags.add(t)))
    
    for (const tag of uniqueTags) {
      await prisma.tag.upsert({
        where: { name: tag },
        create: { name: tag, category: categorizeTag(tag) },
        update: {},
      })
    }

    const allTags = await prisma.tag.findMany()
    const tagIdMap = new Map(allTags.map((t) => [t.name, t.id]))

    // 5. Insert new problems
    const problemRecords = newProblems.map((prob: any) => ({
      cfId: `${prob.contestId}${prob.index}`,
      rating: prob.rating,
      cfLink: `https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`,
      title: prob.name,
      solvedCount: statsMap.get(`${prob.contestId}${prob.index}`) ?? 0,
      contestId: prob.contestId,
    }))

    await prisma.problem.createMany({
      data: problemRecords,
      skipDuplicates: true,
    })

    // 6. Connect tags
    const dbProblems = await prisma.problem.findMany({
      where: { contestId: { gt: maxContestId - 5 } },
      select: { id: true, cfId: true }
    })
    const probIdMap = new Map(dbProblems.map((p) => [p.cfId, p.id]))

    const problemTagRecords: { problemId: string; tagId: string }[] = []
    
    for (const prob of newProblems) {
      const cfId = `${prob.contestId}${prob.index}`
      const problemId = probIdMap.get(cfId)
      if (!problemId) continue

      for (const tagName of prob.tags) {
        const tagId = tagIdMap.get(tagName)
        if (tagId) {
          problemTagRecords.push({ problemId, tagId })
        }
      }
    }

    await prisma.problemTag.createMany({
      data: problemTagRecords,
      skipDuplicates: true,
    })

    return Response.json({ 
      message: "Successfully synced new problems", 
      count: newProblems.length 
    })

  } catch (error: any) {
    console.error("Cron sync-problems error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
