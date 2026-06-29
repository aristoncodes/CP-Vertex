"use client";

import { InfoTooltip } from "@/components/ui/InfoTooltip";

/* ── Shared Analysis Box Components ── */

export function InsightBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#E6F1FB", border: "0.5px solid rgba(24,95,165,0.25)",
      borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10,
      alignItems: "flex-start", marginTop: 12,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#185FA5", flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>info</span>
      <span style={{ fontSize: 13, fontWeight: 400, color: "#185FA5", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

export function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#FAEEDA", border: "0.5px solid rgba(186,117,23,0.25)",
      borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10,
      alignItems: "flex-start", marginTop: 12,
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#BA7517", flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>warning</span>
      <span style={{ fontSize: 13, fontWeight: 400, color: "#BA7517", lineHeight: 1.5 }}>{children}</span>
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
  const barColor = stat.successRate >= 70 ? "#3B6D11" : stat.successRate >= 40 ? "#BA7517" : "#A32D2D";
  const badgeColor = stat.badge === "strong" ? "#EAF3DE" : stat.badge === "ok" ? "#FAEEDA" : "#FCEBEB";
  const badgeText = stat.badge === "strong" ? "#3B6D11" : stat.badge === "ok" ? "#BA7517" : "#A32D2D";

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
  let bg = "#EAF3DE", color = "#3B6D11"; // green
  if (isCount) {
    bg = value > 2 ? "#FCEBEB" : value > 0 ? "#FAEEDA" : "#EAF3DE";
    color = value > 2 ? "#A32D2D" : value > 0 ? "#BA7517" : "#3B6D11";
  } else {
    if (value > 45) { bg = "#FCEBEB"; color = "#A32D2D"; }
    else if (value > 20) { bg = "#FAEEDA"; color = "#BA7517"; }
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
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "#5B4FD4", fontVariationSettings: "'FILL' 1" }}>psychology</span>
        Skill Gap Diagnostics
      </h2>

      <div className="grid-2-collapse">
        {/* Left — Tag Success Rate */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center" }}>
            Tag Success Rate
            <InfoTooltip info="Your problem-solving success rate grouped by algorithm/data structure tags. 'Strong' indicates high reliability, while 'Weak' tags are prime candidates for drilling." align="left" />
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
            <InfoTooltip info="Average minutes to solve problems (A-F) in recent rated contests, and count of Wrong Answers (WA) / Time Limit Exceeded (TLE) verdicts. Red indicates slow pace or high penalty." align="left" />
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
                      <th key={c} style={{ fontSize: 11, fontWeight: 500, color: c === "WA" || c === "TLE" ? "#A32D2D" : "var(--text-faint)", textAlign: "center", padding: "4px 0", width: 48 }}>{c}</th>
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
              {waWarning && <WarningBox>{waWarning}</WarningBox>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
