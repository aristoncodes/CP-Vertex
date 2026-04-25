"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";

const modes = [
  {
    name: "Boss Fight",
    desc: "Face a problem 300-500 above your rating. One target. Maximum XP. Pure challenge.",
    color: "var(--danger)",
    xp: "200-500 XP",
    difficulty: "Extreme",
    icon: "local_fire_department",
    route: "/arena/boss",
  },
  {
    name: "Blitz Mode",
    desc: "3-5 comfort-zone problems. Speed run. Build confidence and stack XP fast.",
    color: "var(--warning)",
    xp: "50-100 XP",
    difficulty: "Normal",
    icon: "bolt",
    route: "/practice/session?mode=blitz",
  },
  {
    name: "Arena",
    desc: "5-8 problems targeting your weakest tags. Systematic improvement.",
    color: "var(--success)",
    xp: "100-250 XP",
    difficulty: "Hard",
    icon: "swords",
    route: "/practice/session?mode=arena",
  },
  {
    name: "Recovery",
    desc: "Easy problems from your strongest tag. Rebuild after a loss streak.",
    color: "var(--info)",
    xp: "30-60 XP",
    difficulty: "Easy",
    icon: "spa",
    route: "/practice/session?mode=recovery",
  },
];

export default function PracticePage() {
  const router = useRouter();
  const { insights, fetchInsights } = useStore();

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const tacticalInsight = insights.find(i => i.type === "gemini_tactical") || insights[0];

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Practice</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>Select your training mode</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {modes.map((mode) => (
          <button
            key={mode.name}
            onClick={() => router.push(mode.route)}
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "28px 24px",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "'Inter', sans-serif",
              transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = mode.color;
              e.currentTarget.style.boxShadow = `0 8px 24px ${mode.color}15`;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${mode.color}10`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: mode.color, fontVariationSettings: "'FILL' 1" }}>
                  {mode.icon}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{mode.name}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: mode.color }}>{mode.xp}</div>
              </div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>{mode.desc}</p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <span className="n-badge" style={{ background: `${mode.color}12`, color: mode.color }}>{mode.difficulty}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="n-card" style={{ padding: "20px 24px" }}>
        <div className="n-section-label">Tactical Recommendation</div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)" }}>
          {tacticalInsight ? (
            <span>
              {tacticalInsight.message.split(/(Arena|Boss Fight|Blitz Mode)/gi).map((part, i) =>
                /(Arena|Boss Fight|Blitz Mode)/i.test(part) ? (
                  <span key={i} style={{ color: "var(--primary)", fontWeight: "bold" }}>{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </span>
          ) : (
            <>Based on your recent performance, <span style={{ color: "var(--primary)", fontWeight: 600 }}>Arena Mode</span> is recommended. Target weak tags to strengthen overall logic.</>
          )}
        </p>
      </div>
    </DashboardLayout>
  );
}
