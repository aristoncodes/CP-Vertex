import { prisma } from "./prisma"
import { redis } from "./redis"
import { CFSubmission, CFProblem } from "./cf-api"
import { addDays } from "date-fns"

// ── Types ────────────────────────────────────────────────────────
export type UpsolveCategory = "target" | "stretch" | "comfort_zone"
export type UpsolveStatus = "pending" | "solved" | "skipped" | "graveyard"
export type UpsolveType = "attempted" | "never_attempted"

interface UpsolveItemInput {
  userId: string
  problemCfId: string
  type: UpsolveType
  attemptCount: number
  lastVerdict: string | null
  category: UpsolveCategory
  priority: number
  xpMultiplier: number
  deadlineAt: Date
}

// ── XP Multiplier ────────────────────────────────────────────────
export function getXPMultiplier(createdAt: Date): number {
  const hoursElapsed = (Date.now() - createdAt.getTime()) / 3_600_000
  if (hoursElapsed < 24) return 2.0
  if (hoursElapsed < 72) return 1.5
  if (hoursElapsed < 168) return 1.0 // 7 days
  if (hoursElapsed < 336) return 0.75 // 14 days
  return 0.5 // graveyard
}

export async function refreshMultipliers(userId: string): Promise<void> {
  const pending = await prisma.upsolveItem.findMany({
    where: { userId, status: "pending" },
  })
  for (const item of pending) {
    const mult = getXPMultiplier(item.createdAt)
    if (mult !== item.xpMultiplier) {
      await prisma.upsolveItem.update({
        where: { id: item.id },
        data: { xpMultiplier: mult },
      })
    }
  }
}

// ── Division Detection ───────────────────────────────────────────
export function detectDivision(contestId: number): number {
  // Heuristic based on common CF contest ID ranges and naming
  // Div 1: typically higher IDs, Div 4: newer lower-4-digit IDs
  // We use a simple range heuristic; can be overridden with contest name
  if (contestId >= 1900) return 4
  if (contestId >= 1600) return 3
  if (contestId >= 1000) return 2
  return 1
}

export function detectDivisionFromName(contestName: string): number {
  const name = contestName.toLowerCase()
  if (name.includes("div. 1") && !name.includes("div. 2")) return 1
  if (name.includes("div. 2")) return 2
  if (name.includes("div. 3")) return 3
  if (name.includes("div. 4")) return 4
  if (name.includes("educational")) return 2
  return 2 // default
}

// ── Target System ────────────────────────────────────────────────
export function getDefaultTargetsForRating(cfRating: number): {
  div1: string; div2: string; div3: string; div4: string
} {
  if (cfRating >= 2700) return { div1: "all", div2: "all", div3: "all", div4: "all" }
  if (cfRating >= 2300) return { div1: "A-E", div2: "all", div3: "all", div4: "all" }
  if (cfRating >= 1900) return { div1: "A-D", div2: "A-F", div3: "all", div4: "all" }
  if (cfRating >= 1500) return { div1: "A-C", div2: "A-E", div3: "all", div4: "all" }
  if (cfRating >= 1100) return { div1: "A-B", div2: "A-D", div3: "A-F", div4: "all" }
  return { div1: "none", div2: "A-B", div3: "A-C", div4: "A-C" }
}

export function expandTarget(target: string): string[] {
  if (target === "all") return ["A", "B", "C", "D", "E", "F", "G", "H"]
  if (target === "none") return []
  const [from, to] = target.split("-")
  const result: string[] = []
  for (let c = from.charCodeAt(0); c <= to.charCodeAt(0); c++) {
    result.push(String.fromCharCode(c))
  }
  return result
}

export function bumpTarget(current: string, direction: 1 | -1): string {
  const all = ["A", "B", "C", "D", "E", "F", "G", "H"]
  if (current === "all") return direction === -1 ? "A-G" : "all"
  if (current === "none") return direction === 1 ? "A-A" : "none"
  const [from, to] = current.split("-")
  const toIdx = all.indexOf(to)
  const newToIdx = Math.min(Math.max(toIdx + direction, 0), all.length - 1)
  if (newToIdx < 0) return "none"
  if (newToIdx >= all.length - 1) return "all"
  return `${from}-${all[newToIdx]}`
}

export function getTargetForDiv(
  division: number,
  settings: { div1Target: string; div2Target: string; div3Target: string; div4Target: string }
): string {
  switch (division) {
    case 1: return settings.div1Target
    case 2: return settings.div2Target
    case 3: return settings.div3Target
    case 4: return settings.div4Target
    default: return settings.div2Target
  }
}

export function categorise(
  problemIndex: string,
  division: number,
  settings: { div1Target: string; div2Target: string; div3Target: string; div4Target: string }
): UpsolveCategory {
  const target = getTargetForDiv(division, settings)
  const targetIndices = expandTarget(target)
  if (targetIndices.length === 0) return "comfort_zone"

  const rank = problemIndex.charCodeAt(0) - 65 // A=0, B=1, ...
  const maxTarget = targetIndices.length - 1

  if (rank <= maxTarget) return "target"
  if (rank === maxTarget + 1) return "stretch"
  return "stretch"
}

// ── Priority Calculation ─────────────────────────────────────────
export async function calcPriority(
  type: UpsolveType,
  category: UpsolveCategory
): Promise<number> {
  // 1 = high, 2 = mid, 3 = low
  if (category === "target" && type === "attempted") return 1
  if (category === "target") return 2
  return 3
}

// ── Get or Create User Contest Settings ─────────────────────────
export async function getUserContestSettings(userId: string) {
  let settings = await prisma.userContestSettings.findUnique({
    where: { userId },
  })
  if (!settings) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cfRating: true },
    })
    const defaults = getDefaultTargetsForRating(user?.cfRating || 0)
    settings = await prisma.userContestSettings.create({
      data: {
        userId,
        div1Target: defaults.div1,
        div2Target: defaults.div2,
        div3Target: defaults.div3,
        div4Target: defaults.div4,
      },
    })
  }
  return settings
}

// ── Contest Problems (cached) ────────────────────────────────────
export async function getContestProblems(contestId: number): Promise<CFProblem[]> {
  const cacheKey = `cf:contest:problems:${contestId}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return typeof cached === "string" ? JSON.parse(cached) : (cached as CFProblem[])
  }

  const url = `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CF standings HTTP error: ${res.status}`)
  const data = await res.json()
  
  if (data.status === "OK") {
    const problems: CFProblem[] = data.result.problems
    // Cache 30 days — contest problems are immutable
    await redis.setex(cacheKey, 86400 * 30, JSON.stringify(problems))
    return problems
  }

  // Fallback to problemset.problems if contest.standings requires authentication or fails
  console.warn(`CF standings failed for ${contestId} (${data.comment}). Falling back to problemset.problems.`)
  const psUrl = `https://codeforces.com/api/problemset.problems`
  const psRes = await fetch(psUrl)
  if (!psRes.ok) throw new Error(`CF problemset HTTP error: ${psRes.status}`)
  const psData = await psRes.json()
  
  if (psData.status === "OK") {
    const problems = psData.result.problems.filter((p: any) => p.contestId === contestId)
    if (problems.length > 0) {
      await redis.setex(cacheKey, 86400 * 30, JSON.stringify(problems))
      return problems
    }
  }

  throw new Error(`CF standings error: ${data.comment} and no problems found in problemset`)
}

// ── Core Detection ───────────────────────────────────────────────
export async function detectUpsolveItems(
  userId: string,
  contestId: number,
  contestName: string,
  contestEndTime: Date,
  newSubs: CFSubmission[]
): Promise<UpsolveItemInput[]> {
  const settings = await getUserContestSettings(userId)
  const division = detectDivisionFromName(contestName)

  let allProblems: CFProblem[]
  try {
    allProblems = await getContestProblems(contestId)
  } catch {
    console.warn(`Could not fetch problems for contest ${contestId}`)
    return []
  }

  // Only submissions during the contest window
  const contestSubs = newSubs.filter(
    (s) =>
      s.contestId === contestId &&
      new Date(s.creationTimeSeconds * 1000) <= contestEndTime
  )

  const getIndex = (cfId: string) => cfId.replace(String(contestId), "")

  const solvedIdx = new Set(
    contestSubs.filter((s) => s.verdict === "OK").map((s) => s.problem.index)
  )
  const attemptedIdx = new Set(
    contestSubs.filter((s) => s.verdict !== "OK").map((s) => s.problem.index)
  )

  const items: UpsolveItemInput[] = []

  for (const prob of allProblems) {
    if (solvedIdx.has(prob.index)) continue // already solved — skip

    const type: UpsolveType = attemptedIdx.has(prob.index)
      ? "attempted"
      : "never_attempted"
    const attempts = contestSubs.filter((s) => s.problem.index === prob.index)
    const lastVerdict = attempts.at(-1)?.verdict ?? null
    const category = categorise(prob.index, division, settings)
    const priority = await calcPriority(type, category)

    items.push({
      userId,
      problemCfId: `${contestId}${prob.index}`,
      type,
      attemptCount: attempts.length,
      lastVerdict,
      category,
      priority,
      xpMultiplier: 2.0,
      deadlineAt: addDays(new Date(), 14),
    })
  }

  return items
}

// ── Adaptive Target Adjustment ───────────────────────────────────
export async function checkAdaptiveTarget(userId: string, division: number): Promise<void> {
  const settings = await getUserContestSettings(userId)
  if (!settings.autoAdjust) return

  const target = getTargetForDiv(division, settings)
  const targetIndices = expandTarget(target)
  if (targetIndices.length === 0) return
  const targetMax = targetIndices.at(-1)!

  const recent = await prisma.contestParticipation.findMany({
    where: { userId, division },
    orderBy: { participatedAt: "desc" },
    take: 5,
    include: {
      upsolveItems: {
        include: { problem: true },
      },
    },
  })

  if (recent.length < 4) return // need enough data

  const solvedMax = recent.filter((c) =>
    c.upsolveItems.some(
      (item) =>
        item.status === "solved" && item.problem.cfId.endsWith(targetMax)
    )
  ).length

  if (solvedMax >= 4) {
    const newTarget = bumpTarget(target, 1)
    const updateData: Record<string, string> = {}
    updateData[`div${division}Target`] = newTarget

    await prisma.userContestSettings.update({
      where: { userId },
      data: updateData,
    })

    await prisma.notification.create({
      data: {
        userId,
        type: "target_upgraded",
        title: "Target upgraded!",
        message: `You solved ${targetMax} in ${solvedMax}/5 recent Div ${division} contests. Target updated to ${newTarget}.`,
      },
    })
  }
}
