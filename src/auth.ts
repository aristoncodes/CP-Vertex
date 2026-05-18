import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) return null

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID || "dummy",
      clientSecret: process.env.GITHUB_SECRET || "dummy",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, capture the user ID
      if (user) {
        token.userId = user.id
      }

      // On EVERY token refresh, pull fresh data from the DB
      // This ensures XP, level, streak, cfRating are never stale.
      if (token.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: {
            id: true,
            xp: true,
            level: true,
            cfHandle: true,
            cfRating: true,
            streakCurrent: true,
            image: true,
          },
        })
        if (dbUser) {
          token.xp = dbUser.xp
          token.level = dbUser.level
          token.cfHandle = dbUser.cfHandle
          token.cfRating = dbUser.cfRating ?? 0
          token.streak = dbUser.streakCurrent
          token.image = dbUser.image
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.xp = token.xp as number
      session.user.level = token.level as number
      session.user.cfHandle = token.cfHandle as string | null
      session.user.cfRating = token.cfRating as number
      session.user.streak = token.streak as number
      if (token.image) {
        session.user.image = token.image as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
