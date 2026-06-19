import { create } from "zustand";
import { mockUser, mockMissions, mockTopicStrengths, mockCoachInsights, type MockMission, type MockTopicStrength, type MockCoachInsight } from "@/data/mock";
import { getLevelFromXP, getXPToNextLevel } from "@/lib/xp-math";

interface UserState {
  name: string;
  handle: string;
  rating: number;
  level: number;
  title: string;
  xp: number;
  xpForNextLevel: number;
  streak: number;
  totalSolved: number;
}

interface AppState {
  /* User */
  user: UserState;
  setUser: (u: Partial<UserState>) => void;

  /* Missions */
  missions: MockMission[];
  activeMissionId: string | null;
  setActiveMission: (id: string | null) => void;
  completeMission: (id: string) => void;

  /* Topic strengths */
  topics: MockTopicStrength[];
  
  /* Coach insights */
  insights: MockCoachInsight[];
  
  /* Rating history */
  ratingHistory: any[];

  /* Fetch actions */
  fetchInsights: () => Promise<void>;
  fetchRatingHistory: () => Promise<void>;
  generateRecommendation: () => Promise<void>;

  /* XP gain action */
  gainXP: (amount: number) => void;

  /* Boss fight */
  bossHP: number;
  setBossHP: (hp: number) => void;

  /* UI state */
  showPostMortem: boolean;
  setShowPostMortem: (show: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
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

  missions: mockMissions,
  activeMissionId: null,
  setActiveMission: (id) => set({ activeMissionId: id }),
  completeMission: (id) =>
    set((s) => ({
      missions: s.missions.map((m) => (m.id === id ? { ...m, done: true } : m)),
    })),

  topics: [],
  insights: [],
  ratingHistory: [],

  fetchInsights: async () => {
    try {
      const res = await fetch("/api/user/insights");
      if (res.ok) {
        const data = await res.json();
        set({ topics: data.topics, insights: data.insights });
      }
    } catch (e) {
      console.error("Failed to fetch insights:", e);
    }
  },

  fetchRatingHistory: async () => {
    try {
      const res = await fetch("/api/user/rating");
      if (res.ok) {
        const data = await res.json();
        set({ ratingHistory: data.ratingHistory || [] });
      }
    } catch (e) {
      console.error("Failed to fetch rating history:", e);
    }
  },

  generateRecommendation: async () => {
    try {
      const res = await fetch("/api/user/insights/generate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        set((s) => ({ insights: [data.insight, ...s.insights] }));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate recommendation");
      }
    } catch (e) {
      console.error("Failed to generate recommendation:", e);
      alert("An error occurred while generating the recommendation.");
    }
  },

  gainXP: (amount) =>
    set((s) => {
      let newXP = s.user.xp + amount;
      
      const newLevel = getLevelFromXP(newXP);
      const { needed } = getXPToNextLevel(newXP);

      return { user: { ...s.user, xp: newXP, level: newLevel, xpForNextLevel: needed } };
    }),

  bossHP: 3,
  setBossHP: (hp) => set({ bossHP: hp }),

  showPostMortem: false,
  setShowPostMortem: (show) => set({ showPostMortem: show }),
}));
