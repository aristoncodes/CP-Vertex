"use client";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

/* ── What-If Panel ── */

interface WhatIfData {
  contestName: string; contestId: number;
  before: { rank: number; ratingDelta: number; penalty: number };
  after: { rank: number; ratingDelta: number; penalty: number };
}

function WhatIfPanel({ data }: { data: WhatIfData }) {
  const rankDiff = data.before.rank - data.after.rank;
  const deltaDiff = data.after.ratingDelta - data.before.ratingDelta;

  return (
    <div className="n-card" style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        What-If Simulator
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
        {data.contestName.length > 40 ? data.contestName.slice(0, 38) + "…" : data.contestName}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 0 }}>
        {/* Before */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-faint)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Before</div>
          <StatLine label="Rank" value={`#${data.before.rank}`} />
          <StatLine label="Δ Rating" value={data.before.ratingDelta > 0 ? `+${data.before.ratingDelta}` : `${data.before.ratingDelta}`} color={data.before.ratingDelta >= 0 ? "#3B6D11" : "#A32D2D"} />
          <StatLine label="Penalty" value={`${data.before.penalty} min`} />
        </div>
        {/* Divider */}
        <div style={{ width: 1, background: "var(--border)", margin: "0 20px" }} />
        {/* After */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#5B4FD4", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>After (simulated)</div>
          <StatLine label="Rank" value={`#${data.after.rank}`} diff={rankDiff > 0 ? `↑${rankDiff}` : undefined} diffColor="#3B6D11" />
          <StatLine label="Δ Rating" value={data.after.ratingDelta > 0 ? `+${data.after.ratingDelta}` : `${data.after.ratingDelta}`} color={data.after.ratingDelta >= 0 ? "#3B6D11" : "#A32D2D"} diff={deltaDiff > 0 ? `+${deltaDiff}` : undefined} diffColor="#3B6D11" />
          <StatLine label="Penalty" value={`${data.after.penalty} min`} />
        </div>
      </div>
    </div>
  );
}

function StatLine({ label, value, color, diff, diffColor }: { label: string; value: string; color?: string; diff?: string; diffColor?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 2 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: color || "var(--text-primary)" }}>{value}</span>
        {diff && <span style={{ fontSize: 11, color: diffColor || "#3B6D11", fontWeight: 500 }}>{diff}</span>}
      </div>
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
      {/* Priority dot */}
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0 }} />
      {/* Letter badge */}
      <div style={{
        width: 28, height: 28, borderRadius: 6, background: badgeBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 500, color: dotColor, flexShrink: 0,
      }}>{problem.index}</div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          <a href={`https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`} target="_blank" rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#5B4FD4")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-primary)")}
          >{problem.name}</a>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {problem.contestName.length > 30 ? problem.contestName.slice(0, 28) + "…" : problem.contestName}
        </div>
      </div>
      {/* Rating + tag */}
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
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "#5B4FD4", fontVariationSettings: "'FILL' 1" }}>strategy</span>
        Contest Strategy
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Left — What-If */}
        {whatIf ? <WhatIfPanel data={whatIf} /> : (
          <div className="n-card" style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "32px 0" }}>No rated contest data available.</div>
          </div>
        )}

        {/* Right — Upsolve Priority */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Upsolve Priority
          </div>
          {upsolvePriority.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "32px 0" }}>
              No unsolved problems from recent contests. Great job!
            </div>
          ) : (
            upsolvePriority.map((p, i) => <UpsolveRow key={`${p.contestId}-${p.index}`} problem={p} />)
          )}
        </div>
      </div>
    </div>
  );
}
