"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState, useCallback } from "react";
import { XPBar } from "@/components/ui/XPBar";
import { MissionCard } from "@/components/ui/MissionCard";
import { CoachInsightCard } from "@/components/ui/CoachInsightCard";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { useStore } from "@/store/useStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UpsolveWidget } from "@/components/upsolve/UpsolveWidget";

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

/* ─────────────────────────── Quick-Play Cards ──────────────────────── */

const quickPlayModes = [
  {
    key: "warmup", label: "Warmup", icon: "speed",
    desc: "Easy 15-min session", color: "#059669", bg: "#059669",
    href: "/practice/session?mode=warmup",
  },
  {
    key: "blitz", label: "Blitz", icon: "bolt",
    desc: "Fast 30-min sprint", color: "#0891b2", bg: "#0891b2",
    href: "/practice/session?mode=blitz",
  },
  {
    key: "arena", label: "Arena", icon: "fitness_center",
    desc: "Train weak topics", color: "#0366d6", bg: "#0366d6",
    href: "/practice/session?mode=arena",
  },
  {
    key: "boss", label: "Boss Fight", icon: "swords",
    desc: "Daily boss challenge", color: "#dc2626", bg: "#dc2626",
    href: "/arena/boss",
  },
];

/* ──────────────────── Main Content (left column) ───────────────────── */

function DashboardMain({ profile }: { profile: any }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [pendingDuels, setPendingDuels] = useState(0);

  useEffect(() => {
    fetch("/api/duels?status=pending").then(r => r.json()).then(d => {
      if (Array.isArray(d.duels)) setPendingDuels(d.duels.length);
    }).catch(() => { });
  }, []);

  const user = {
    name: profile?.name || session?.user?.name || "Guest",
    level: profile?.level || session?.user?.level || 1,
    xp: profile?.xp || session?.user?.xp || 0,
    streak: session?.user?.streak || 0,
    rating: profile?.cfRating || 0,
    totalSolved: profile?.totalSolved || 0,
    title: profile?.level >= 40 ? "Gold Coder" : profile?.level >= 20 ? "Silver Coder" : "Bronze Coder",
  };

  // Determine greeting based on time
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour >= 5 && hour < 12) greeting = "Good morning";
  else if (hour >= 12 && hour < 16) greeting = "Good afternoon";
  else if (hour >= 17 && hour < 20) greeting = "Good evening";
  else greeting = "Late night coding";

  return (
    <>
      {/* ── Greeting + Streak ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            {greeting}, <span style={{ color: "var(--primary)" }}>{user.name}</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6, fontWeight: 500 }}>
            Level {user.level} · {user.totalSolved} problems solved · {user.rating > 0 ? `CF ${user.rating}` : "No CF rating yet"}
          </p>
        </div>
        <StreakDisplay count={user.streak} />
      </div>

      {/* ── XP Progress ── */}
      <XPBar totalXP={user.xp} title={user.title} />

      {/* ── Quick Play — The Action Center ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="n-section-label" style={{ margin: 0 }}>Quick Play</div>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Jump straight into training</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {quickPlayModes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => router.push(mode.href)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                padding: "20px 18px", borderRadius: 14, border: "1px solid var(--border)",
                background: "var(--surface-card)", cursor: "pointer",
                transition: "all 0.2s", fontFamily: "'Inter', sans-serif",
                position: "relative", overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = mode.color;
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = `0 8px 24px ${mode.color}18`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${mode.color}12`, display: "flex",
                alignItems: "center", justifyContent: "center", marginBottom: 12,
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 22, color: mode.color, fontVariationSettings: "'FILL' 1",
                }}>{mode.icon}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{mode.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Today's Snapshot — Compact Stats ── */}
      <div>
        <div className="n-section-label">Today&apos;s Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "CF Rating", value: user.rating > 0 ? user.rating.toLocaleString() : "—", color: "var(--info)", icon: "trending_up" },
            { label: "Solved", value: user.totalSolved.toLocaleString(), color: "var(--success)", icon: "check_circle" },
            { label: "Total XP", value: (user.xp / 1000).toFixed(1) + "K", color: "var(--warning)", icon: "star" },
            { label: "Level", value: String(user.level), color: "var(--primary)", icon: "military_tech" },
          ].map((stat) => (
            <div key={stat.label} className="n-card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: stat.color, fontVariationSettings: "'FILL' 1" }}>
                  {stat.icon}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color, letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending Duels Alert ── */}
      {pendingDuels > 0 && (
        <button
          onClick={() => router.push("/arena")}
          className="n-card"
          style={{
            padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
            border: "1px solid rgba(220,38,38,0.3)", cursor: "pointer",
            background: "rgba(220,38,38,0.04)", width: "100%",
            fontFamily: "'Inter', sans-serif", borderRadius: 14,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "rgba(220,38,38,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 22, color: "var(--danger)", fontVariationSettings: "'FILL' 1",
              animation: "pulse 2s infinite",
            }}>swords</span>
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>
              {pendingDuels} Duel Challenge{pendingDuels > 1 ? "s" : ""} Waiting
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Someone wants to battle you!</div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--text-muted)" }}>arrow_forward</span>
        </button>
      )}
    </>
  );
}

/* ──────────────────── Right Column: Intel & Missions ───────────────── */

function IntelPanel({ profile }: { profile: any }) {
  const { insights, missions: storeMissions, completeMission, gainXP, generateRecommendation, setActiveMission } = useStore();
  const [apiMissions, setApiMissions] = useState<ApiMission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);

  useEffect(() => {
    fetch("/api/missions/today")
      .then((res) => res.json())
      .then((data) => {
        if (data.missions && data.missions.length > 0) {
          setApiMissions(data.missions);
        }
        setLoadingMissions(false);
      })
      .catch(() => setLoadingMissions(false));
  }, []);

  const displayMissions = apiMissions.length > 0
    ? apiMissions.map((m) => ({
      id: m.id,
      label: m.title,
      type: m.description.toUpperCase(),
      xp: m.xpReward,
      done: m.completed,
    }))
    : storeMissions;

  const handleComplete = useCallback(async (id: string) => {
    const apiMission = apiMissions.find((m) => m.id === id);
    if (apiMission) {
      try {
        const res = await fetch(`/api/missions/${id}/complete`, { method: "PATCH" });
        const data = await res.json();
        if (data.success) {
          setApiMissions((prev) =>
            prev.map((m) => (m.id === id ? { ...m, completed: true } : m))
          );
          gainXP(data.xpAwarded || apiMission.xpReward);
        } else {
          alert(data.error || "Failed to complete mission");
        }
      } catch (e) {
        console.error("Failed to complete mission:", e);
        alert("Failed to complete mission. Please try again.");
      }
    } else {
      const m = storeMissions.find((x) => x.id === id);
      if (m && !m.done) {
        alert("This is a mock mission. Please refresh the page to sync real missions from the server!");
      }
    }
  }, [apiMissions, storeMissions, completeMission, gainXP, setActiveMission]);

  const wt = profile?.weeklyTarget;

  return (
    <>
      {/* Coach's Corner */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="n-section-label" style={{ marginBottom: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            Coach&apos;s Brief
          </div>
          <button className="n-btn-primary" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => generateRecommendation()}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
          </button>
        </div>
        {insights.length > 0 ? (
          <CoachInsightCard insight={insights[0]} />
        ) : (
          <div className="n-card" style={{ padding: "16px", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--text-faint)", marginBottom: 8 }}>psychology</span>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No intel yet. Solve a few problems first!</div>
          </div>
        )}
      </div>

      {/* Active Missions */}
      <div>
        <div className="n-section-label">Active Missions</div>
        {loadingMissions ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0", textAlign: "center" }}>
            Loading missions...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
            {displayMissions.map((m) => (
              <MissionCard key={m.id} mission={m} onComplete={() => handleComplete(m.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Weekly Target */}
      <div>
        <div className="n-section-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>
            <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4, color: "var(--accent, var(--primary))", fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            AI Roadmap
          </span>
          <button
            className="n-btn-primary"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={async () => {
              try {
                await fetch("/api/roadmap", { method: "POST" });
                window.location.reload();
              } catch { /* ignore */ }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>refresh</span>
            Generate
          </button>
        </div>
        <div className="n-card" style={{ padding: "16px 18px" }}>
          {wt ? (
            <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "var(--primary)", fontWeight: 700, textTransform: "capitalize", fontSize: 15 }}>{wt.tag}</span>
                <span style={{
                  color: wt.progress >= wt.targetCount ? "var(--success)" : "var(--primary)",
                  fontWeight: 700, fontSize: 13,
                }}>
                  {wt.progress}/{wt.targetCount}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, borderRadius: 2, background: "var(--surface-high, var(--surface-low))", marginBottom: 8 }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  background: wt.progress >= wt.targetCount ? "var(--success)" : "var(--primary)",
                  width: `${Math.min(100, (wt.progress / wt.targetCount) * 100)}%`,
                  transition: "width 0.5s ease",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {wt.minRating}–{wt.maxRating} rated · {wt.targetCount} problems
              </div>
              {/* AI Reasoning / Why */}
              {wt.why && (
                <div style={{
                  marginTop: 10, padding: "8px 12px",
                  background: "var(--surface-high, var(--surface-low))",
                  borderRadius: 8, borderLeft: "3px solid var(--accent, var(--primary))",
                  fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, fontStyle: "italic",
                }}>
                  {wt.why}
                </div>
              )}
              {/* Subtopics */}
              {wt.subtopics && wt.subtopics.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {wt.subtopics.map((s: string, i: number) => (
                    <span key={i} style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 6,
                      background: "var(--primary-light)", color: "var(--primary)",
                      fontWeight: 600,
                    }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
              No active roadmap.<br />
              <span style={{ fontSize: 12 }}>Click Generate to create an AI-powered training plan.</span>
            </div>
          )}
        </div>
      </div>

      {/* Upsolve Queue */}
      <div className="n-card" style={{ padding: "16px 18px" }}>
        <UpsolveWidget />
      </div>
    </>
  );
}

/* ────────────────────────── Page Export ─────────────────────────────── */

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  // Onboarding redirect (#1)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const onboarded = localStorage.getItem("cp-vertex:onboarded");
      if (!onboarded) {
        router.push("/onboarding");
      }
    }
  }, [router]);

  useEffect(() => {
    if (session?.user?.cfHandle || session?.user?.name) {
      fetch(`/api/user/${session.user.cfHandle || session.user.name}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setProfile(data);
        });
    }
  }, [session]);

  return (
    <DashboardLayout rightPanel={<IntelPanel profile={profile} />}>
      <DashboardMain profile={profile} />
    </DashboardLayout>
  );
}
