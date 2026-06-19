/**
 * Seed Problems from Codeforces
 *
 * Run once on init, then nightly via cron to pull new problems from CF.
 * Usage: npx tsx src/scripts/seed-problems.ts
 */

import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const CF_BASE = "https://codeforces.com/api"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function categorizeTag(tag: string): string {
  if (
    ["dp", "greedy", "binary search", "divide and conquer", "two pointers"].includes(
      tag
    )
  )
    return "algorithms"
  if (
    ["graphs", "trees", "dfs and similar", "shortest paths"].includes(tag)
  )
    return "graphs"
  if (["data structures", "segment tree", "dsu"].includes(tag))
    return "data structures"
  if (["strings", "string suffix structures"].includes(tag)) return "strings"
  if (["math", "number theory", "combinatorics", "geometry"].includes(tag))
    return "math"
  return "advanced"
}

interface CFProblem {
  contestId: number
  index: string
  name: string
  rating?: number
  tags: string[]
}

interface CFProblemStats {
  contestId: number
  index: string
  solvedCount: number
}

async function main() {
  console.log("🌱 Starting FAST CP Vertex problem seed from Codeforces...")

  // Fetch all problems
  const res = await fetch(`${CF_BASE}/problemset.problems`)
  const data = await res.json()

  if (data.status !== "OK") {
    console.error("CF API error:", data.comment)
    process.exit(1)
  }

  const problems: CFProblem[] = data.result.problems.filter((p: any) => p.rating != null)
  const stats: CFProblemStats[] = data.result.problemStatistics
  const statsMap = new Map(
    stats.map((s) => [`${s.contestId}${s.index}`, s.solvedCount])
  )

  console.log(`Found ${problems.length} rated problems from Codeforces`)

  // 1. Gather and Upsert all unique tags
  const uniqueTags = new Set<string>()
  problems.forEach((p) => p.tags.forEach((t) => uniqueTags.add(t)))
  
  console.log(`Ensuring ${uniqueTags.size} tags exist...`)
  for (const tag of uniqueTags) {
    await prisma.tag.upsert({
      where: { name: tag },
      create: { name: tag, category: categorizeTag(tag) },
      update: {},
    })
  }

  // 2. Fetch all tag IDs
  const allTags = await prisma.tag.findMany()
  const tagIdMap = new Map(allTags.map((t) => [t.name, t.id]))

  // 3. Batch insert problems
  console.log("Bulk inserting problems (skipping duplicates)...")
  
  const problemRecords = problems.map((prob) => ({
    cfId: `${prob.contestId}${prob.index}`,
    rating: prob.rating!,
    cfLink: `https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`,
    title: prob.name,
    solvedCount: statsMap.get(`${prob.contestId}${prob.index}`) ?? 0,
    contestId: prob.contestId,
  }))

  await prisma.problem.createMany({
    data: problemRecords,
    skipDuplicates: true,
  })

  // 4. Fetch all problem IDs to map for ProblemTag
  console.log("Fetching problem IDs for relation mapping...")
  const allProblems = await prisma.problem.findMany({
    select: { id: true, cfId: true }
  })
  const probIdMap = new Map(allProblems.map((p) => [p.cfId, p.id]))

  // 5. Construct ProblemTag records
  console.log("Constructing problem-tag relations...")
  const problemTagRecords: { problemId: string; tagId: string }[] = []
  
  for (const prob of problems) {
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

  console.log(`Bulk inserting ${problemTagRecords.length} problem-tag relations...`)
  await prisma.problemTag.createMany({
    data: problemTagRecords,
    skipDuplicates: true,
  })

  console.log("\n✅ Seed complete!")

  // Also seed initial badges
  await seedBadges()

  // And seed initial missions
  await seedMissions()

  await prisma.$disconnect()
}

async function seedBadges() {
  console.log("\n🏅 Seeding badges...")

  const badges = [
    {
      slug: "first_ac",
      name: "First Blood",
      description: "Get your first Accepted verdict",
      category: "milestone",
      iconEmoji: "⚔️",
    },
    {
      slug: "streak_7",
      name: "Week Warrior",
      description: "Maintain a 7-day solve streak",
      category: "consistency",
      iconEmoji: "🔥",
    },
    {
      slug: "streak_30",
      name: "Iron Will",
      description: "Maintain a 30-day solve streak",
      category: "consistency",
      iconEmoji: "💎",
    },
    {
      slug: "dp_master",
      name: "DP Master",
      description: "Score 80+ on Dynamic Programming",
      category: "topic",
      iconEmoji: "🧠",
    },
    {
      slug: "boss_slayer",
      name: "Boss Slayer",
      description: "Defeat 10 daily boss problems",
      category: "milestone",
      iconEmoji: "🐉",
    },
    {
      slug: "hundred_solves",
      name: "Centurion",
      description: "Solve 100 problems",
      category: "milestone",
      iconEmoji: "💯",
    },
    {
      slug: "postmortem_10",
      name: "Self-Aware",
      description: "Write 10 post-mortems",
      category: "milestone",
      iconEmoji: "📝",
    },
    {
      slug: "duel_winner",
      name: "Gladiator",
      description: "Win your first duel",
      category: "competitive",
      iconEmoji: "⚡",
    },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      create: badge,
      update: badge,
    })
  }

  console.log(`   Seeded ${badges.length} badges`)
}

async function seedMissions() {
  console.log("\n🎯 Seeding mission templates...")

  const missions = [
    {
      type: "solve_tag",
      title: "Tag Explorer",
      description: "Solve a problem with a tag you haven't tried yet",
      xpReward: 50,
      difficulty: "normal",
    },
    {
      type: "post_mortem",
      title: "Reflect & Learn",
      description: "Write a post-mortem on a failed submission",
      xpReward: 30,
      difficulty: "easy",
    },
    {
      type: "boss_fight",
      title: "Boss Fight",
      description: "Attempt today's boss problem",
      xpReward: 100,
      difficulty: "hard",
    },
    {
      type: "speed_solve",
      title: "Speed Demon",
      description: "Solve 3 problems in Blitz mode",
      xpReward: 75,
      difficulty: "normal",
    },
    {
      type: "duel_win",
      title: "Duel Master",
      description: "Challenge and win a duel",
      xpReward: 100,
      difficulty: "hard",
    },
    {
      type: "solve_tag",
      title: "Weak Spot Training",
      description: "Solve a problem from your weakest tag",
      xpReward: 60,
      difficulty: "normal",
    },
    {
      type: "solve_tag",
      title: "Daily Grind",
      description: "Solve any 2 problems today",
      xpReward: 40,
      difficulty: "easy",
    },
  ]

  for (const mission of missions) {
    // Use type + title as a composite key since there's no slug
    const existing = await prisma.mission.findFirst({
      where: { type: mission.type, title: mission.title },
    })
    if (!existing) {
      await prisma.mission.create({ data: mission })
    }
  }

  console.log(`   Seeded ${missions.length} mission templates`)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
