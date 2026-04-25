"use client";

interface Insight {
  type: string;
  message: string;
  priority: "high" | "medium" | "low";
}

export function CoachInsightCard({ insight }: { insight: Insight }) {
  const typeLabels: Record<string, string> = {
    declining_score: "Alert",
    improvement: "Progress",
    blind_spot: "Blind Spot",
    gemini_tactical: "Tactical",
  };
  const label = typeLabels[insight.type] || insight.type;

  return (
    <div style={{
      padding: "16px 18px",
      background: "var(--primary-light)",
      border: "1px solid rgba(3, 102, 214, 0.12)",
      borderRadius: 12,
      borderLeft: "3px solid var(--primary)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>
          smart_toy
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{label}</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
        {insight.message}
      </p>
    </div>
  );
}
