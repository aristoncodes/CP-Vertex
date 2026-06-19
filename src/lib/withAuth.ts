import { auth } from '@/auth'
import { NextRequest } from 'next/server'

type AuthHandler = (req: NextRequest, userId: string) => Promise<Response>

export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest) => {
    try {
      const session = await auth()
      if (!session?.user?.id) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return handler(req, session.user.id)
    } catch (error) {
      console.error("withAuth error:", error)
      return Response.json({ error: "Internal server error in auth" }, { status: 500 })
    }
  }
}
