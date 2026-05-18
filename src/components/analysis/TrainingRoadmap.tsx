"use client";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

interface TrainingProblem {
  contestId: number; index: string; name: string; rating: number;
  tags: string[]; solvedCount: number; weakTag: string;
}

const TAG_COLORS: Record<string, string> = {
  dp: "#BA7517", "dynamic programming": "#BA7517",
  greedy: "#3B6D11", math: "#5B4FD4", "binary search": "#185FA5",
  "data structures": "#0891b2", graphs: "#059669", strings: "#0d9488",
  implementation: "#6b7a91", "number theory": "#7c3aed",
  geometry: "#dc2626", combinatorics: "#d97706",
};

function TrainingCard({ problem }: { problem: TrainingProblem }) {
  const tagColor = TAG_COLORS[problem.weakTag.toLowerCase()] || "#5B4FD4";
  const globalRate = problem.solvedCount > 10000
    ? `${Math.round(problem.solvedCount / 1000)}K`
    : problem.solvedCount.toLocaleString();

  return (
    <a
      href={`https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`}
      target="_blank" rel="noopener noreferrer"
      className="n-card"
      style={{
        padding: "20px", display: "flex", flexDirection: "column", gap: 10,
        textDecoration: "none", cursor: "pointer",
      }}
    >
      {/* Tag badge + gap fill */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 10, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
          background: `${tagColor}15`, color: tagColor, textTransform: "capitalize",
        }}>{problem.weakTag}</span>
        <span style={{
          fontSize: 9, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
          background: "#EEEDFE", color: "#5B4FD4", textTransform: "uppercase", letterSpacing: "0.06em",
        }}>gap fill</span>
      </div>
      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>
        {problem.name}
      </div>
      {/* Rating + solve count */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <span style={{
          fontSize: 13, fontWeight: 500,
          color: problem.rating >= 1800 ? "#A32D2D" : problem.rating >= 1400 ? "#BA7517" : "#3B6D11",
        }}>
          ★ {problem.rating}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {globalRate} solved
        </span>
      </div>
    </a>
  );
}

interface Props {
  problems: TrainingProblem[];
  loading: boolean;
}

export function TrainingRoadmap({ problems, loading }: Props) {
  if (loading) return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Training Roadmap</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[1, 2, 3, 4].map(i => <div key={i} className="n-card" style={{ padding: 20 }}><Skeleton width="100%" height={100} /></div>)}
      </div>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "#5B4FD4", fontVariationSettings: "'FILL' 1" }}>route</span>
        Training Roadmap
      </h2>
      {problems.length === 0 ? (
        <div className="n-card" style={{ padding: "32px", textAlign: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--text-faint)", marginBottom: 8 }}>school</span>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Waiting for diagnostics data to generate recommendations...</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {problems.map(p => <TrainingCard key={`${p.contestId}-${p.index}`} problem={p} />)}
        </div>
      )}
    </div>
  );
}
