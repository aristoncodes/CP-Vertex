import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      xp: number
      level: number
      cfHandle: string | null
      cfRating: number
      streak: number
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    xp?: number
    level?: number
    cfHandle?: string | null
    cfRating?: number
    streak?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    userId?: string
    xp?: number
    level?: number
    cfHandle?: string | null
    cfRating?: number
    streak?: number
  }
}
