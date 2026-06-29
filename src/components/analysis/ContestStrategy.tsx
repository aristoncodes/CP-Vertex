"use client";

import { InfoTooltip } from "@/components/ui/InfoTooltip";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

/* ── What-If Panel ── */

interface WhatIfData {
  contestName: string; contestId: number;
  actualRank: number; actualDelta: number;
  solvedCount: number; totalProblems: number;
  waCount: number; tleCount: number;
  savedMinutes: number;
  estimatedBetterDelta: number; estimatedBetterRank: number;
}

function WhatIfPanel({ data }: { data: WhatIfData }) {
  const rankDiff = data.actualRank - data.estimatedBetterRank;
  const deltaDiff = data.estimatedBetterDelta - data.actualDelta;
  const hasImprovement = data.savedMinutes > 0;

  return (
    <div className="n-card" style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center" }}>
        What-If Simulator
        <InfoTooltip info="Estimates your rank and rating change if you had solved the same problems without any Wrong Answer penalties." align="left" />
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        {data.contestName.length > 40 ? data.contestName.slice(0, 38) + "…" : data.contestName}
      </div>

      {/* Actual performance */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <StatChip label="Rank" value={`#${data.actualRank}`} />
        <StatChip label="Δ Rating" value={data.actualDelta > 0 ? `+${data.actualDelta}` : `${data.actualDelta}`}
          color={data.actualDelta >= 0 ? "#3B6D11" : "#A32D2D"} />
        <StatChip label="Solved" value={`${data.solvedCount}/${data.totalProblems}`} />
        <StatChip label="WA" value={`${data.waCount}`} color={data.waCount > 3 ? "#A32D2D" : "var(--text-primary)"} />
      </div>

      {/* What-if result */}
      {hasImprovement ? (
        <div style={{
          background: "#EAF3DE", border: "0.5px solid rgba(59,109,17,0.2)",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#3B6D11", marginBottom: 6 }}>
            💡 If you had 0 WA on easy problems (A-C):
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#3B6D11" }}>
              Saved <strong>~{data.savedMinutes} min</strong>
            </span>
            {rankDiff > 0 && (
              <span style={{ fontSize: 12, color: "#3B6D11" }}>
                Rank <strong>↑{rankDiff}</strong> → #{data.estimatedBetterRank}
              </span>
            )}
            {deltaDiff > 0 && (
              <span style={{ fontSize: 12, color: "#3B6D11" }}>
                Rating <strong>+{deltaDiff} more</strong>
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          background: "#EAF3DE", border: "0.5px solid rgba(59,109,17,0.2)",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ fontSize: 12, color: "#3B6D11" }}>
            ✅ Clean performance — no WA on easy problems!
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, color: color || "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

/* ── Upsolve Priority ── */

interface UpsolveProblem {
  contestId: number; index: string; name: string; contestName: string;
  rating: number; tags: string[]; priority: "red" | "amber" | "green"; distance: number;
}

function UpsolveRow({ problem }: { problem: UpsolveProblem }) {
  const dotColor = problem.priority === "red" ? "#A32D2D" : problem.priority === "amber" ? "#BA7517" : "#3B6D11";
  const badgeBg = problem.priority === "red" ? "#FCEBEB" : problem.priority === "amber" ? "#FAEEDA" : "#EAF3DE";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
      borderBottom: "0.5px solid var(--border)",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      <div style={{
        width: 28, height: 28, borderRadius: 6, background: badgeBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 500, color: dotColor, flexShrink: 0,
      }}>{problem.index}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <a href={`https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`} target="_blank" rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-primary)")}
          >{problem.name}</a>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {problem.contestName.length > 30 ? problem.contestName.slice(0, 28) + "…" : problem.contestName}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{problem.rating}</div>
        {problem.tags[0] && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, textTransform: "capitalize" }}>{problem.tags[0]}</div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */

interface Props {
  whatIf: WhatIfData | null;
  upsolvePriority: UpsolveProblem[];
  loading: boolean;
}

export function ContestStrategy({ whatIf, upsolvePriority, loading }: Props) {
  if (loading) return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Contest Strategy</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="n-card" style={{ padding: "20px 24px" }}><Skeleton width="100%" height={180} /></div>
        <div className="n-card" style={{ padding: "20px 24px" }}><Skeleton width="100%" height={180} /></div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>strategy</span>
        Contest Strategy
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {whatIf ? <WhatIfPanel data={whatIf} /> : (
          <div className="n-card" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "32px 0" }}>No rated contest data available.</div>
          </div>
        )}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center" }}>
            Upsolve Priority
            <InfoTooltip info="Problems you failed to solve in recent contests, ordered by proximity to your current rating. Red dots indicate problems you should be able to solve right now." align="right" />
          </div>
          {upsolvePriority.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "32px 0" }}>
              No unsolved problems from recent contests. Great job!
            </div>
          ) : (
            upsolvePriority.map((p) => <UpsolveRow key={`${p.contestId}-${p.index}`} problem={p} />)
          )}
        </div>
      </div>
    </div>
  );
}
