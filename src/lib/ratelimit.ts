import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  }
  return _redis
}

let _rateLimits: Record<string, Ratelimit> | null = null

function getRateLimits() {
  if (!_rateLimits) {
    const redis = getRedis()
    _rateLimits = {
      cfConnect: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "rl:cf-connect",
      }),
      postMortem: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        prefix: "rl:postmortem",
      }),
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        prefix: "rl:api",
      }),
      duel: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "24 h"),
        prefix: "rl:duel",
      }),
      signup: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        prefix: "rl:signup",
      }),
    }
  }
  return _rateLimits
}

export const rateLimits = new Proxy({} as Record<string, Ratelimit>, {
  get(_target, prop: string) {
    return getRateLimits()[prop]
  },
})

/**
 * Helper to check rate limit and return a 429 Response if exceeded.
 * Returns null if the request is allowed.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<Response | null> {
  const { success } = await limiter.limit(identifier)
  if (!success) {
    return Response.json(
      { error: "Rate limited. Please try again later." },
      { status: 429 }
    )
  }
  return null
}
