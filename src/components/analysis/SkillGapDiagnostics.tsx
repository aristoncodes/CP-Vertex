"use client";

import { InfoTooltip } from "@/components/ui/InfoTooltip";

/* ── Shared Analysis Box Components ── */

export function InsightBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--info-light)", border: "0.5px solid rgba(24,95,165,0.25)",
      borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10,
      alignItems: "flex-start", marginTop: 12,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--info)", flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>info</span>
      <span style={{ fontSize: 13, fontWeight: 400, color: "var(--info)", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

export function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--warning-light)", border: "0.5px solid rgba(186,117,23,0.25)",
      borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10,
      alignItems: "flex-start", marginTop: 12,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--warning)", flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>warning</span>
      <span style={{ fontSize: 13, fontWeight: 400, color: "var(--warning)", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

/* ── Tag Success Rate Bar ── */

interface TagStat {
  tag: string; successRate: number; total: number; accepted: number;
  badge: "strong" | "ok" | "weak";
  lowerBandRate?: number; currentBandRate?: number;
  lowerBand?: string; currentBand?: string;
}

function TagBar({ stat }: { stat: TagStat }) {
  const barColor = stat.successRate >= 70 ? "var(--success)" : stat.successRate >= 40 ? "var(--warning)" : "var(--danger)";
  const badgeColor = stat.badge === "strong" ? "var(--success-light)" : stat.badge === "ok" ? "var(--warning-light)" : "var(--danger-light)";
  const badgeText = stat.badge === "strong" ? "var(--success)" : stat.badge === "ok" ? "var(--warning)" : "var(--danger)";

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize" }}>{stat.tag}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)" }}>{stat.successRate}%</span>
          <span style={{
            fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
            background: badgeColor, color: badgeText, textTransform: "uppercase", letterSpacing: "0.04em",
          }}>{stat.badge}</span>
        </div>
      </div>
      <div style={{ width: "100%", height: 6, background: "var(--surface-high)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${stat.successRate}%`, height: "100%", borderRadius: 3,
          background: barColor, transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Pace Heatmap ── */

interface PaceRow {
  contestId: number; contestName: string;
  cells: Record<string, { time: number | null; waCount: number; tleCount: number }>;
}

function HeatCell({ value, isCount }: { value: number | null; isCount?: boolean }) {
  if (value === null) return (
    <td style={{
      width: 48, height: 40, textAlign: "center", fontSize: 12, color: "var(--text-faint)",
      background: "var(--surface-high)", borderRadius: 4,
    }}>—</td>
  );
  let bg = "var(--success-light)", color = "var(--success)"; // green
  if (isCount) {
    bg = value > 2 ? "var(--danger-light)" : value > 0 ? "var(--warning-light)" : "var(--success-light)";
    color = value > 2 ? "var(--danger)" : value > 0 ? "var(--warning)" : "var(--success)";
  } else {
    if (value > 45) { bg = "var(--danger-light)"; color = "var(--danger)"; }
    else if (value > 20) { bg = "var(--warning-light)"; color = "var(--warning)"; }
  }
  return (
    <td style={{
      width: 48, height: 40, textAlign: "center", fontSize: 13, fontWeight: 500,
      color, background: bg, borderRadius: 4,
    }}>{value}</td>
  );
}

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

/* ── Main Component ── */

interface Props {
  tagStats: TagStat[];
  paceHeatmap: PaceRow[];
  loading: boolean;
}

export function SkillGapDiagnostics({ tagStats, paceHeatmap, loading }: Props) {
  if (loading) return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Skill Gap Diagnostics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="n-card" style={{ padding: "20px 24px" }}>
          {[1, 2, 3, 4].map(i => <div key={i} style={{ marginBottom: 14 }}><Skeleton width="100%" height={32} /></div>)}
        </div>
        <div className="n-card" style={{ padding: "20px 24px" }}><Skeleton width="100%" height={160} /></div>
      </div>
    </div>
  );

  // Find worst tag insight
  const worstTag = tagStats[0];
  const insightText = worstTag && worstTag.lowerBandRate !== undefined
    ? `Your ${worstTag.tag} success drops from ${worstTag.lowerBandRate}% at ${worstTag.lowerBand} to ${worstTag.currentBandRate}% at ${worstTag.currentBand}. Focus on ${worstTag.currentBand} ${worstTag.tag} problems.`
    : worstTag
    ? `Your ${worstTag.tag} success rate is ${worstTag.successRate}%. This is your weakest area — focus here.`
    : null;

  // Find worst WA
  const waWarning = (() => {
    for (const row of paceHeatmap) {
      for (const [idx, cell] of Object.entries(row.cells)) {
        if (idx !== "WA" && idx !== "TLE" && cell.waCount > 2) {
          return `You average ${cell.waCount} wrong answers before AC on Problem ${idx}.`;
        }
      }
    }
    return null;
  })();

  const COLS = ["A", "B", "C", "D", "E", "F", "WA", "TLE"];

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>psychology</span>
        Skill Gap Diagnostics
      </h2>

      <div className="grid-2-collapse">
        {/* Left — Tag Success Rate */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center" }}>
            Tag Success Rate
            <InfoTooltip info="Distinct problems solved ÷ attempted in each tag, counted only within your current rating band (and the one below) — so it measures how reliably you solve AT YOUR LEVEL. This is a pure accuracy metric; the profile's Topic Mastery score also factors in volume, difficulty, and recency." align="left" />
          </div>
          {tagStats.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
              Not enough data to analyze tags.
            </div>
          ) : (
            <>
              {tagStats.slice(0, 8).map((stat) => <TagBar key={stat.tag} stat={stat} />)}
              {insightText && <InsightBox>{insightText}</InsightBox>}
            </>
          )}
        </div>

        {/* Right — Pace & Accuracy Heatmap */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center" }}>
            Pace & Accuracy
            <InfoTooltip info="For your last 5 rated contests: A–F show minutes from contest start to your FIRST accepted solution (lower is faster). WA / TLE count rejected submissions made BEFORE you solved each problem — the same attempts Codeforces penalizes. Green = fast/clean, amber = some friction, red = slow or many failed attempts." align="left" />
          </div>
          {paceHeatmap.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
              No rated contest data found.
            </div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 3 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 11, fontWeight: 500, color: "var(--text-faint)", textAlign: "left", padding: "4px 8px" }}>Contest</th>
                    {COLS.map(c => (
                      <th key={c} style={{ fontSize: 11, fontWeight: 500, color: c === "WA" || c === "TLE" ? "var(--danger)" : "var(--text-faint)", textAlign: "center", padding: "4px 0", width: 48 }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paceHeatmap.map(row => (
                    <tr key={row.contestId}>
                      <td style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 8px", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.contestName.length > 20 ? row.contestName.slice(0, 18) + "…" : row.contestName}
                      </td>
                      {COLS.map(c => <HeatCell key={c} value={row.cells[c]?.time ?? null} isCount={c === "WA" || c === "TLE"} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Legend — make the meaning explicit */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, fontSize: 11, color: "var(--text-muted)" }}>
                <span><strong style={{ color: "var(--text-secondary)" }}>A–F</strong> = minutes to first solve</span>
                <span><strong style={{ color: "var(--text-secondary)" }}>WA / TLE</strong> = wrong / TLE attempts before solving</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--success-light)", display: "inline-block" }} /> fast/clean
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--warning-light)", display: "inline-block", marginLeft: 6 }} /> some
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--danger-light)", display: "inline-block", marginLeft: 6 }} /> slow/many
                </span>
              </div>
              {waWarning && <WarningBox>{waWarning}</WarningBox>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
