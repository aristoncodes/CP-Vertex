import { create } from "zustand"
import { mockMissions, type MockMission, type MockTopicStrength, type MockCoachInsight } from "@/data/mock"

interface MissionStore {
  missions: MockMission[]
  activeMissionId: string | null
  setActiveMission: (id: string | null) => void
  completeMission: (id: string) => void

  topics: MockTopicStrength[]
  insights: MockCoachInsight[]
  
  fetchInsights: () => Promise<void>
  generateRecommendation: () => Promise<void>
}

export const useMissionStore = create<MissionStore>((set) => ({
  missions: mockMissions,
  activeMissionId: null,
  setActiveMission: (id) => set({ activeMissionId: id }),
  completeMission: (id) =>
    set((s) => ({
      missions: s.missions.map((m) => (m.id === id ? { ...m, done: true } : m)),
    })),

  topics: [],
  insights: [],

  fetchInsights: async () => {
    try {
      const res = await fetch("/api/user/insights")
      if (res.ok) {
        const data = await res.json()
        set({ topics: data.topics, insights: data.insights })
      }
    } catch (e) {
      console.error("Failed to fetch insights:", e)
    }
  },

  generateRecommendation: async () => {
    try {
      const res = await fetch("/api/user/insights/generate", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        set((s) => ({ insights: [data.insight, ...s.insights] }))
      } else {
        const err = await res.json()
        alert(err.error || "Failed to generate recommendation")
      }
    } catch (e) {
      console.error("Failed to generate recommendation:", e)
      alert("An error occurred while generating the recommendation.")
    }
  },
}))
