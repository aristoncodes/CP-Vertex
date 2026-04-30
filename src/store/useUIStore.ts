import { create } from "zustand"

interface UIStore {
  bossHP: number
  setBossHP: (hp: number) => void
  showPostMortem: boolean
  setShowPostMortem: (show: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  bossHP: 3,
  setBossHP: (hp) => set({ bossHP: hp }),
  showPostMortem: false,
  setShowPostMortem: (show) => set({ showPostMortem: show }),
}))
