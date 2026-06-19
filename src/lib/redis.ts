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

// Re-export as `redis` for backward compatibility — lazy getter
export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    return (getRedis() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// BullMQ connection config (IORedis-compatible)
function parseBullMQConnection() {
  const url = process.env.BULLMQ_REDIS_URL
  if (!url) {
    return {
      host: "localhost",
      port: 6379,
    }
  }

  try {
    const parsed = new URL(url)
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    }
  } catch {
    return {
      host: "localhost",
      port: 6379,
    }
  }
}

export const bullMQConnection = parseBullMQConnection()
