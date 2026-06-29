"use client";

import { getXPToNextLevel, getLevelFromXP } from "@/lib/xp-math";
import { useSeriousMode } from "@/hooks/useSeriousMode";

export function XPBar({ totalXP, title }: { totalXP: number; title?: string }) {
  const level = getLevelFromXP(totalXP);
  const { current, needed } = getXPToNextLevel(totalXP);
  const pct = needed > 0 ? Math.min(100, (current / needed) * 100) : 100;
  const serious = useSeriousMode();

  // Serious mode: a thin, muted progress line instead of the star/level hero.
  if (serious) {
    return (
      <div className="n-card" style={{ padding: "12px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
            Level {level}{title ? ` · ${title}` : ""}
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)" }}>
            {current.toLocaleString()} / {needed > 0 ? needed.toLocaleString() : "MAX"} XP
          </span>
        </div>
        <div className="n-progress-track" style={{ height: 4 }}>
          <div className="n-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="n-card" style={{ padding: "18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--warning)", fontVariationSettings: "'FILL' 1" }}>star</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Level {level}</span>
          {title && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>· {title}</span>}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
          {current.toLocaleString()} / {needed > 0 ? needed.toLocaleString() : "MAX"} XP
        </span>
      </div>
      <div className="n-progress-track">
        <div className="n-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
