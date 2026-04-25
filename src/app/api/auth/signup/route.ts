import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { NextRequest } from "next/server"
import { rateLimits, checkRateLimit } from "@/lib/ratelimit"

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1"
    const rateLimited = await checkRateLimit(rateLimits.signup, ip)
    if (rateLimited) return rateLimited

    const body = await request.json()
    const { name, email, password, cfHandle } = body

    // Validation
    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return Response.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // Check if CF handle is taken (if provided)
    if (cfHandle) {
      const existingHandle = await prisma.user.findUnique({
        where: { cfHandle },
      })
      if (existingHandle) {
        return Response.json(
          { error: "This Codeforces handle is already linked to another account." },
          { status: 409 }
        )
      }
    }

    // Hash password and create user
    const passwordHash = await hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        cfHandle: cfHandle || null,
      },
    })

    return Response.json(
      { message: "Account created successfully.", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/auth/signup error:", error)
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    )
  }
}
