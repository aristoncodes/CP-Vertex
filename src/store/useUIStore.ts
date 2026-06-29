import { create } from "zustand"

interface UIStore {
  bossHP: number
  setBossHP: (hp: number) => void
  showPostMortem: boolean
  setShowPostMortem: (show: boolean) => void
  // Mobile nav drawer (left rail) open state
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  bossHP: 3,
  setBossHP: (hp) => set({ bossHP: hp }),
  showPostMortem: false,
  setShowPostMortem: (show) => set({ showPostMortem: show }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
