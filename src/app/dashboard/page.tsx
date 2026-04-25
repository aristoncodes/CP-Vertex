"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { XPBar } from "@/components/ui/XPBar";
import { Heatmap } from "@/components/ui/Heatmap";
import { MissionCard } from "@/components/ui/MissionCard";
import { SkillBar } from "@/components/ui/SkillBar";
import { CoachInsightCard } from "@/components/ui/CoachInsightCard";
import { StreakDisplay } from "@/components/ui/StreakDisplay";
import { MissionMap } from "@/components/ui/MissionMap";
import { useStore } from "@/store/useStore";
import { useSession } from "next-auth/react";

function DashboardMain({ profile }: { profile: any }) {
  const { topics, fetchInsights } = useStore();
  const { data: session } = useSession();

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const user = {
    name: profile?.name || session?.user?.name || "Guest",
    level: profile?.level || session?.user?.level || 1,
    xp: profile?.xp || session?.user?.xp || 0,
    streak: session?.user?.streak || 0,
    rating: profile?.cfRating || 0,
    totalSolved: profile?.totalSolved || 0,
    title: profile?.level >= 40 ? "Gold Coder" : profile?.level >= 20 ? "Silver Coder" : "Bronze Coder",
  };

  return (
    <>
      {/* Greeting */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            Welcome back, <span style={{ color: "var(--primary)" }}>{user.name}</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6, fontWeight: 500 }}>
            Level {user.level} · 2 missions remaining
          </p>
        </div>
        <StreakDisplay count={user.streak} />
      </div>

      {/* Stats Row */}
      <div>
        <div className="n-section-label">Overview</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "CF Rating", value: user.rating.toLocaleString(), color: "var(--info)", icon: "trending_up" },
            { label: "Problems Solved", value: user.totalSolved.toLocaleString(), color: "var(--success)", icon: "check_circle" },
            { label: "Total XP", value: (user.xp / 1000).toFixed(1) + "K", color: "var(--warning)", icon: "star" },
            { label: "Level", value: String(user.level), color: "var(--primary)", icon: "military_tech" },
          ].map((stat) => (
            <div key={stat.label} className="n-card" style={{ padding: "20px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: stat.color, fontVariationSettings: "'FILL' 1" }}>
                  {stat.icon}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* XP Progress */}
      <XPBar totalXP={user.xp} title={user.title} />

      {/* Full-width column — IntelPanel is separately in DashboardLayout rightPanel */}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>

        {/* Activity Heatmap */}
        <div style={{ position: "relative" }}>
          <Heatmap data={profile?.heatmap || []} />
        </div>

        {/* Skill Assessment — Vertical Bar Chart, sits right below heatmap */}
        {topics.length > 0 && (() => {
          const topicColors: Record<string, string> = {
            "dp": "#d97706", "graphs": "#059669", "math": "#7c3aed",
            "greedy": "#0891b2", "data structures": "#0366d6", "strings": "#0d9488",
            "binary search": "#f59e0b", "implementation": "#6366f1", "sorting": "#8b5cf6",
            "number theory": "#ec4899", "combinatorics": "#f97316", "geometry": "#14b8a6",
            "brute force": "#64748b", "trees": "#22c55e",
          };
          const sorted = [...topics].sort((a, b) => (b.solved || 0) - (a.solved || 0)).slice(0, 12);
          const maxSolved = Math.max(...sorted.map(t => t.solved || 0), 1);
          const BAR_MAX_H = 90;

          return (
            <div className="n-card" style={{ padding: "14px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="n-section-label" style={{ marginBottom: 0 }}>Skill Assessment</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>problems solved · top 12 topics</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                {sorted.map((t) => {
                  const color = topicColors[t.tag.toLowerCase()] || "var(--primary)";
                  const barH = Math.max(Math.round(((t.solved || 0) / maxSolved) * BAR_MAX_H), t.solved > 0 ? 5 : 2);
                  const acPct = t.attempted > 0 ? Math.round((t.solved / t.attempted) * 100) : 0;
                  const trendIcon = t.trend === "up" ? "↑" : t.trend === "down" ? "↓" : "";
                  const trendColor = t.trend === "up" ? "var(--success)" : "var(--danger)";
                  return (
                    <div key={t.tag} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3, flex: "1 1 0", minWidth: 0 }}>
                      {/* Count + trend on top */}
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", lineHeight: 1 }}>
                        {t.solved > 0 ? t.solved : ""}
                        {trendIcon && <span style={{ color: trendColor, fontSize: 9 }}>{trendIcon}</span>}
                      </span>
                      {/* Bar track — grows upward */}
                      <div style={{ width: "100%", height: BAR_MAX_H, background: "var(--surface-high)", borderRadius: "3px 3px 0 0", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                        <div style={{
                          width: "100%",
                          height: barH,
                          background: color,
                          borderRadius: "3px 3px 0 0",
                          opacity: 0.85,
                          transition: "height 0.8s ease",
                        }} />
                      </div>
                      {/* AC% */}
                      <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>{acPct > 0 ? `${acPct}%` : ""}</div>
                      {/* Label */}
                      <div style={{ fontSize: 9, fontWeight: 600, color: "var(--text-secondary)", textAlign: "center", textTransform: "capitalize" as const, lineHeight: 1.2, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                        {t.tag}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Quick Actions */}
        <MissionMap />
      </div>
    </>
  );
}

function IntelPanel({ profile }: { profile: any }) {
  const { insights, missions, completeMission, gainXP, generateRecommendation, setActiveMission } = useStore();

  const handleComplete = (id: string) => {
    const m = missions.find((x) => x.id === id);
    if (m && !m.done) {
      completeMission(id);
      gainXP(m.xp);
      setActiveMission(null);
    }
  };

  const wt = profile?.weeklyTarget;

  return (
    <>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="n-section-label" style={{ marginBottom: 0 }}>Intel Brief</div>
          <button className="n-btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => generateRecommendation()}>
            Generate
          </button>
        </div>
        {insights.length > 0 ? (
          <CoachInsightCard insight={insights[0]} />
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: 14, padding: "12px 0" }}>
            No intel gathered yet. Start solving!
          </div>
        )}
      </div>

      <div>
        <div className="n-section-label">Active Missions</div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} onComplete={() => handleComplete(m.id)} />
          ))}
        </div>
      </div>

      <div>
        <div className="n-section-label">Weekly Target</div>
        <div className="n-card" style={{ padding: "16px 18px" }}>
          {wt ? (
            <div style={{ fontSize: 14, lineHeight: 2, color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Target:</span>{" "}
              <span style={{ color: "var(--primary)", fontWeight: 600, textTransform: "capitalize" }}>{wt.tag}</span>
              <br />
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Objective:</span> {wt.targetCount} problems ({wt.minRating}–{wt.maxRating})
              <br />
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Progress:</span>{" "}
              <span style={{ color: wt.progress >= wt.targetCount ? "var(--success)" : "var(--primary)", fontWeight: 600 }}>
                {wt.progress} / {wt.targetCount}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
              No active target.<br/>
              <span style={{ fontSize: 12 }}>Generate a Learning Roadmap to get started.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<any>(null);

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
