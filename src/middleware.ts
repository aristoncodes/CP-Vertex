import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC = ["/", "/login", "/signup", "/leaderboard"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes and static files
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  // Check for session token (NextAuth sets this cookie)
  const sessionToken =
    request.cookies.get("__Secure-next-auth.session-token") ??
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("authjs.session-token")

  const isAuthenticated = !!sessionToken
  const isPublic = PUBLIC.includes(pathname)

  // Redirect unauthenticated users from protected routes
  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect authenticated users away from login
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
