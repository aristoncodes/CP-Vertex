import { redis } from "./redis"

const CF_BASE = "https://codeforces.com/api"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface CFAPIResponse {
  status: string
  result: unknown
  comment?: string
}

async function cfGet<T = unknown>(
  method: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${CF_BASE}/${method}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const cacheKey = `cf:${method}:${JSON.stringify(params)}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return (typeof cached === "string" ? JSON.parse(cached) : cached) as T
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    // Serve stale cache if CF is down
    const stale = await redis.get(`cf:stale:${method}:${JSON.stringify(params)}`)
    if (stale) {
      console.warn(`CF API returned ${res.status}, serving stale cache for ${method}`)
      return (typeof stale === "string" ? JSON.parse(stale) : stale) as T
    }
    throw new Error(`CF API HTTP error: ${res.status}`)
  }

  const data: CFAPIResponse = await res.json()
  if (data.status !== "OK") {
    throw new Error(`CF API error: ${data.comment}`)
  }

  // Cache for 5 minutes, stale backup for 1 hour
  await redis.setex(cacheKey, 300, JSON.stringify(data.result))
  await redis.setex(`cf:stale:${method}:${JSON.stringify(params)}`, 3600, JSON.stringify(data.result))

  return data.result as T
}

// ─── Public API ─────────────────────────────────────

export interface CFUser {
  handle: string
  rating?: number
  maxRating?: number
  rank?: string
  avatar?: string
  titlePhoto?: string
}

export interface CFSubmission {
  id: number
  contestId: number
  creationTimeSeconds: number
  relativeTimeSeconds?: number
  problem: {
    contestId: number
    index: string
    name: string
    rating?: number
    tags: string[]
  }
  author: {
    participantType: string
    contestId?: number
    members?: { handle: string }[]
  }
  verdict: string
  programmingLanguage: string
  timeConsumedMillis: number
  memoryConsumedBytes: number
}

export interface CFProblem {
  contestId: number
  index: string
  name: string
  rating?: number
  tags: string[]
}

export interface CFProblemStatistics {
  contestId: number
  index: string
  solvedCount: number
}

export interface CFRatingChange {
  contestId: number
  contestName: string
  handle: string
  rank: number
  ratingUpdateTimeSeconds: number
  oldRating: number
  newRating: number
}

export const getCFUser = (handle: string): Promise<CFUser[]> =>
  cfGet<CFUser[]>("user.info", { handles: handle })

export const getCFRatingHistory = (handle: string): Promise<CFRatingChange[]> =>
  cfGet<CFRatingChange[]>("user.rating", { handle })

export const getCFSubmissions = (
  handle: string,
  from = 1,
  count = 100
): Promise<CFSubmission[]> =>
  cfGet<CFSubmission[]>("user.status", {
    handle,
    from: String(from),
    count: String(count),
  })

export const getCFProblems = (): Promise<{
  problems: CFProblem[]
  problemStatistics: CFProblemStatistics[]
}> =>
  cfGet<{ problems: CFProblem[]; problemStatistics: CFProblemStatistics[] }>(
    "problemset.problems",
    {}
  )

export async function validateCFHandle(handle: string): Promise<boolean> {
  try {
    const users = await getCFUser(handle)
    return Array.isArray(users) && users.length > 0
  } catch {
    return false
  }
}

// Fetch ALL submissions for initial import (paginated, respects rate limit)
export async function fetchAllSubmissions(
  handle: string
): Promise<CFSubmission[]> {
  const all: CFSubmission[] = []
  let from = 1

  while (true) {
    const batch = await getCFSubmissions(handle, from, 1000)
    all.push(...batch)
    if (batch.length < 1000) break
    from += 1000
    await sleep(200) // respect 5 req/sec limit
  }

  return all
}
