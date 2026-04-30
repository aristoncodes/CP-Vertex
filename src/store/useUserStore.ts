import { create } from "zustand"
import { mockUser } from "@/data/mock"
import { getLevelFromXP, getXPToNextLevel } from "@/lib/xp-math"

interface UserState {
  name: string
  handle: string
  rating: number
  level: number
  title: string
  xp: number
  xpForNextLevel: number
  streak: number
  totalSolved: number
}

interface UserStore {
  user: UserState
  setUser: (u: Partial<UserState>) => void
  gainXP: (amount: number) => void
  ratingHistory: any[]
  fetchRatingHistory: () => Promise<void>
}

export const useUserStore = create<UserStore>((set) => ({
  user: {
    name: mockUser.name,
    handle: mockUser.handle,
    rating: mockUser.rating,
    level: getLevelFromXP(mockUser.xp),
    title: mockUser.title,
    xp: mockUser.xp,
    xpForNextLevel: getXPToNextLevel(mockUser.xp).needed,
    streak: mockUser.streak,
    totalSolved: mockUser.totalSolved,
  },
  setUser: (u) => set((s) => ({ user: { ...s.user, ...u } })),
  gainXP: (amount) =>
    set((s) => {
      let newXP = s.user.xp + amount
      const newLevel = getLevelFromXP(newXP)
      const { needed } = getXPToNextLevel(newXP)
      return { user: { ...s.user, xp: newXP, level: newLevel, xpForNextLevel: needed } }
    }),
  ratingHistory: [],
  fetchRatingHistory: async () => {
    try {
      const res = await fetch("/api/user/rating")
      if (res.ok) {
        const data = await res.json()
        set({ ratingHistory: data.ratingHistory || [] })
      }
    } catch (e) {
      console.error("Failed to fetch rating history:", e)
    }
  },
}))
