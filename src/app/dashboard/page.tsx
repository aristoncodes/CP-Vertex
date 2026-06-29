"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState, useCallback } from "react";
import { MissionCard } from "@/components/ui/MissionCard";
import { useStore } from "@/store/useStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { getLevelFromXP, getXPToNextLevel } from "@/lib/xp-math";

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

  const xp = profile?.xp || session?.user?.xp || 0;
  const user = {
    name: profile?.name || session?.user?.name || "there",
    level: getLevelFromXP(xp),
    xp,
    streak: session?.user?.streak || 0,
    rating: profile?.cfRating || 0,
    totalSolved: profile?.totalSolved || 0,
  };
  const xpProg = getXPToNextLevel(xp);

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12 ? "Good morning"
    : hour >= 12 && hour < 17 ? "Good afternoon"
    : hour >= 17 && hour < 21 ? "Good evening"
    : "Late night";


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

  const stats = [
    { label: "CF Rating", value: user.rating > 0 ? user.rating.toLocaleString() : "—", icon: "trending_up", color: "var(--info)" },
    { label: "Solved", value: user.totalSolved.toLocaleString(), icon: "check_circle", color: "var(--success)" },
    { label: "Level", value: String(user.level), icon: "military_tech", color: "var(--primary)" },
    { label: "Streak", value: user.streak > 0 ? `${user.streak}d` : "—", icon: "local_fire_department", color: "var(--warning)" },
  ];

  return (
    <>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          {greeting}, {user.name}
        </h1>
        <p style={{ fontSize: "var(--text-md)", color: "var(--text-muted)", marginTop: 4 }}>
          Level {user.level} · {xpProg.needed > 0 ? `${xpProg.current.toLocaleString()} / ${xpProg.needed.toLocaleString()} XP to next level` : "Max level"}
        </p>
      </div>

      {/* Hero — primary action driven by the weekly roadmap target */}
      <div
        className="n-card n-card--pad-lg"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 24, flexWrap: "wrap",
          borderLeft: "3px solid var(--primary)",
          background: "linear-gradient(90deg, var(--primary-lighter), var(--surface-card) 55%)",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="n-section-label" style={{ marginBottom: 8 }}>Continue training</div>
          <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Drill your weakest topics
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 8 }}>
            A focused set of problems targeting the tags where you lose the most points.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button className="n-btn n-btn--secondary" onClick={() => router.push("/train")}>All modes</button>
          <button className="n-btn n-btn--primary n-btn--lg" onClick={() => router.push("/train/session?mode=drill")}>
            Start
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }} className="dash-stats">
        {stats.map((s) => (
          <div key={s.label} className="n-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "var(--radius-sm)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", marginTop: 2 }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
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

      {/* Two-column: activity + today */}
      <div className="grid-2-collapse" style={{ alignItems: "start" }}>
        <div>
          <div className="n-section-label">Recent activity</div>
          <RecentActivity />
        </div>
        <div>
          <div className="n-section-label">Today</div>
          {missions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {missions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={{ id: m.id, label: m.title, type: m.description.toUpperCase(), xp: m.xpReward, done: m.completed }}
                  onComplete={() => completeMission(m.id)}
                />
              ))}
            </div>
          ) : (
            <div className="n-card" style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-base)" }}>
              No missions yet — solve a few problems to generate today&apos;s set.
            </div>
          )}
        </div>
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
