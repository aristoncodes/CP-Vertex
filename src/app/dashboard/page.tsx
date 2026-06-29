"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState, useCallback } from "react";
import { MissionCard } from "@/components/ui/MissionCard";
import { useStore } from "@/store/useStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RecentActivity } from "@/components/dashboard/RecentActivity";

interface ApiMission {
  id: string;
  type: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  completedAt: string | null;
  progress: number;
  target: number;
}

/* ────────────────────────────── Dashboard ───────────────────────────── */

function DashboardMain({ profile }: { profile: any }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { gainXP } = useStore();
  const [pendingDuels, setPendingDuels] = useState(0);
  const [missions, setMissions] = useState<ApiMission[]>([]);

  useEffect(() => {
    fetch("/api/duels?status=pending")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.duels)) setPendingDuels(d.duels.length); })
      .catch(() => {});
    fetch("/api/missions/today?t=" + Date.now())
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.missions)) setMissions(d.missions); })
      .catch(() => {});
  }, []);

  const user = {
    name: profile?.name || session?.user?.name || "there",
    level: profile?.level || session?.user?.level || 1,
    xp: profile?.xp || session?.user?.xp || 0,
    streak: session?.user?.streak || 0,
    rating: profile?.cfRating || 0,
    totalSolved: profile?.totalSolved || 0,
  };

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Good morning"
    : hour >= 12 && hour < 17 ? "Good afternoon"
    : hour >= 17 && hour < 21 ? "Good evening"
    : "Late night";

  const wt = profile?.weeklyTarget;

  const completeMission = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/missions/${id}/complete`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, completed: true } : m)));
        gainXP(data.xpAwarded || 0);
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert("Failed to complete mission. Please try again.");
    }
  }, [gainXP]);

  const stat = (label: string, value: string) => (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{value}</span>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
    </span>
  );

  return (
    <>
      {/* Header: greeting + streak */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          {greeting}, {user.name}
        </h1>
        {user.streak > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-md)", color: "var(--text-secondary)", fontWeight: 600 }}>
            <span style={{ fontSize: 16 }}>🔥</span> {user.streak}-day streak
          </span>
        )}
      </div>

      {/* Thin stat line */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: "var(--text-md)", marginTop: -8 }}>
        {stat("rating", user.rating > 0 ? String(user.rating) : "—")}
        {stat("solved", user.totalSolved.toLocaleString())}
        {stat("level", String(user.level))}
        {stat("XP", user.xp.toLocaleString())}
      </div>

      {/* Primary action — driven by the weekly roadmap target */}
      <div className="n-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div className="n-section-label" style={{ marginBottom: 6 }}>Continue training</div>
          {wt ? (
            <>
              <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
                Focus: {wt.tag}
              </div>
              <div style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", marginTop: 4 }}>
                {wt.progress}/{wt.targetCount} done · {wt.minRating}–{wt.maxRating} rated
              </div>
            </>
          ) : (
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--text-primary)" }}>
              Drill your weakest topics
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button className="n-btn n-btn--secondary" onClick={() => router.push("/train")}>
            All modes
          </button>
          <button className="n-btn n-btn--primary" onClick={() => router.push("/train/session?mode=drill")}>
            Start
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Pending duels (only when present) */}
      {pendingDuels > 0 && (
        <button
          onClick={() => router.push("/compete")}
          className="n-card n-card--interactive"
          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22, color: "var(--primary)" }}>swords</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--text-primary)" }}>
              {pendingDuels} duel challenge{pendingDuels > 1 ? "s" : ""} waiting
            </div>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Open Compete to respond</div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--text-muted)" }}>arrow_forward</span>
        </button>
      )}

      {/* Today's missions */}
      {missions.length > 0 && (
        <div>
          <div className="n-section-label">Today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {missions.map((m) => (
              <MissionCard
                key={m.id}
                mission={{ id: m.id, label: m.title, type: m.description.toUpperCase(), xp: m.xpReward, done: m.completed }}
                onComplete={() => completeMission(m.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div className="n-section-label">Recent activity</div>
        <RecentActivity />
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  // Send first-time users through onboarding
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("cp-vertex:onboarded")) {
      router.push("/onboarding");
    }
  }, [router]);

  useEffect(() => {
    if (session?.user?.cfHandle || session?.user?.name) {
      fetch(`/api/user/${session.user.cfHandle || session.user.name}`)
        .then((res) => res.json())
        .then((data) => { if (!data.error) setProfile(data); });
    }
  }, [session]);

  return (
    <DashboardLayout>
      <DashboardMain profile={profile} />
    </DashboardLayout>
  );
}
