import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`
    
    // Check Redis
    await redis.ping()

    return Response.json({ status: "ok", message: "All systems operational" }, { status: 200 })
  } catch (error) {
    console.error("Health check failed:", error)
    return Response.json({ status: "error", message: "Service unavailable" }, { status: 503 })
  }
}
