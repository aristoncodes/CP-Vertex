import { redis } from "./redis"

const CF_BASE = "https://codeforces.com/api"

// ─── Global Rate Limiter (1 req/sec across the entire platform) ─────────
// Uses a simple in-process queue + mutex. For multi-instance deployments,
// swap this for a Redis-based distributed lock (e.g., Redlock).

let lastRequestTime = 0
// Codeforces allows ~1 request every 2 seconds per IP; go slightly over that
// so the whole server stays under "Call limit exceeded".
const MIN_INTERVAL_MS = 2100
const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 2000

let lastRequestPromise = Promise.resolve()

/**
 * Wait until enough time has passed since the last CF API call.
 * This ensures global rate-limiting to ~1 req/sec within this process,
 * strictly queuing concurrent requests.
 */
async function acquireSlot(): Promise<void> {
  const previousPromise = lastRequestPromise
  
  let resolveNext!: () => void
  lastRequestPromise = new Promise((resolve) => {
    resolveNext = resolve
  })

  // Wait for the person in front of us to finish their slot
  await previousPromise

  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_INTERVAL_MS) {
    await sleep(MIN_INTERVAL_MS - elapsed)
  }
  
  lastRequestTime = Date.now()
  // Release the next person in line
  resolveNext()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface CFAPIResponse {
  status: string
  result: unknown
  comment?: string
}

/**
 * Core CF API fetcher with:
 * - Redis caching (5 min fresh / 1 hour stale fallback)
 * - Global rate-limit queue (1 req/sec)
 * - Exponential backoff on 429 / 503 / network errors
 */
async function cfGet<T = unknown>(
  method: string,
  params: Record<string, string>,
  opts: { bypassCache?: boolean; cacheTtlSec?: number } = {}
): Promise<T> {
  const { bypassCache = false, cacheTtlSec = 300 } = opts
  const url = new URL(`${CF_BASE}/${method}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const cacheKey = `cf:${method}:${JSON.stringify(params)}`
  const staleKey = `cf:stale:${method}:${JSON.stringify(params)}`

  // 1. Check fresh cache first (skipped when the caller needs live data,
  //    e.g. duel verification, where a stale solve list would miss a solve).
  if (!bypassCache) {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return (typeof cached === "string" ? JSON.parse(cached) : cached) as T
    }
  }

  // 2. Rate-limited fetch with exponential backoff
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Wait for our turn in the global queue
      await acquireSlot()

      const res = await fetch(url.toString())

      // Retry on rate-limit or server overload
      if (res.status === 429 || res.status === 503) {
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt)
        console.warn(
          `CF API returned ${res.status} for ${method}, retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms`
        )
        await sleep(backoffMs)
        continue
      }

      if (!res.ok) {
        // Serve stale cache if CF is down
        const stale = await redis.get(staleKey)
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

      // Cache for the requested TTL (default 5 min), stale backup for 1 hour
      await redis.setex(cacheKey, cacheTtlSec, JSON.stringify(data.result))
      await redis.setex(staleKey, 3600, JSON.stringify(data.result))

      return data.result as T
    } catch (err) {
      lastError = err as Error

      // Don't retry on non-retryable errors (bad request, parse errors, etc.)
      if (
        lastError.message.includes("CF API error:") ||
        lastError.message.includes("CF API HTTP error: 4")
      ) {
        // 4xx errors (except 429) are not retryable
        if (!lastError.message.includes("429")) {
          throw lastError
        }
      }

      if (attempt < MAX_RETRIES - 1) {
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt)
        console.warn(
          `CF API request failed for ${method}, retry ${attempt + 1}/${MAX_RETRIES} in ${backoffMs}ms:`,
          lastError.message
        )
        await sleep(backoffMs)
      }
    }
  }

  // All retries exhausted — try stale cache as last resort
  const stale = await redis.get(staleKey)
  if (stale) {
    console.warn(`CF API exhausted retries for ${method}, serving stale cache`)
    return (typeof stale === "string" ? JSON.parse(stale) : stale) as T
  }

  throw lastError ?? new Error(`CF API failed after ${MAX_RETRIES} retries`)
}

// ─── Public API ─────────────────────────────────────

export interface CFUser {
  handle: string
  rating?: number
  maxRating?: number
  rank?: string
  avatar?: string    // small avatar (80x80)
  titlePhoto?: string // large avatar (full-size)
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
  count = 100,
  opts?: { bypassCache?: boolean; cacheTtlSec?: number }
): Promise<CFSubmission[]> =>
  cfGet<CFSubmission[]>("user.status", {
    handle,
    from: String(from),
    count: String(count),
  }, opts)

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
    // acquireSlot() inside cfGet already enforces 1 req/sec,
    // but we add a small buffer for safety during bulk imports
    await sleep(500)
  }

  return all
}
