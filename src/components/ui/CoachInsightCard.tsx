"use client";

import { useRouter } from "next/navigation";

interface Insight {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
}

const typeConfig: Record<string, { label: string; icon: string; color: string; actionLabel?: string; actionRoute?: string }> = {
  declining_score: { label: "Alert", icon: "trending_down", color: "var(--danger)", actionLabel: "Start Drill", actionRoute: "/train/session?mode=drill" },
  improvement: { label: "Progress", icon: "trending_up", color: "var(--success)" },
  blind_spot: { label: "Blind Spot", icon: "visibility_off", color: "var(--warning)", actionLabel: "Target Weakness", actionRoute: "/train/session?mode=drill" },
  gemini_tactical: { label: "Tactical", icon: "smart_toy", color: "var(--primary)", actionLabel: "Act on This", actionRoute: "/train" },
};

export function CoachInsightCard({ insight }: { insight: Insight }) {
  const router = useRouter();
  const config = typeConfig[insight.type] || { label: insight.type, icon: "smart_toy", color: "var(--primary)" };

  // Try to detect recommended mode from message
  const getRecommendedRoute = () => {
    const msg = insight.message.toLowerCase();
    if (msg.includes("boss fight")) return "/arena/boss";
    if (msg.includes("blitz")) return "/train/session?mode=blitz";
    if (msg.includes("drill") || msg.includes("arena")) return "/train/session?mode=drill";
    return config.actionRoute || "/train";
  };

  return (
    <div style={{
      padding: "16px 18px",
      background: "var(--primary-light)",
      border: "1px solid rgba(3, 102, 214, 0.12)",
      borderRadius: 12,
      borderLeft: `3px solid ${config.color}`,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: config.color, fontVariationSettings: "'FILL' 1" }}>
            {config.icon}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: config.color }}>{config.label}</span>
          {insight.priority === "high" && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
              background: "var(--danger-light)", color: "var(--danger)",
            }}>HIGH</span>
          )}
        </div>
      </div>

      {/* Message */}
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", margin: "0 0 12px" }}>
        {insight.message}
      </p>

      {/* Action button */}
      {config.actionLabel && (
        <button
          onClick={() => router.push(getRecommendedRoute())}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 14px", fontSize: 12, fontWeight: 700,
            background: `${config.color}15`, color: config.color,
            border: `1px solid ${config.color}30`, borderRadius: 8,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            transition: "background 0.15s",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
          {config.actionLabel}
        </button>
      )}
    </div>
  );
}
