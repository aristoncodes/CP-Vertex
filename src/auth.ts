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
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            xp: true,
            level: true,
            cfHandle: true,
            cfRating: true,
            streakCurrent: true,
          },
        })
        token.userId = dbUser?.id
        token.xp = dbUser?.xp ?? 0
        token.level = dbUser?.level ?? 1
        token.cfHandle = dbUser?.cfHandle
        token.cfRating = dbUser?.cfRating ?? 0
        token.streak = dbUser?.streakCurrent ?? 0
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
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
