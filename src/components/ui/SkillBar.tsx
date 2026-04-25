"use client";

interface Topic {
  tag: string;
  solved: number;
  attempted: number;
  score: number;
  trend: "up" | "down" | "flat";
}

export function SkillBar({ topic, delay = 0 }: { topic: Topic; delay?: number }) {
  const pct = topic.attempted > 0 ? Math.round((topic.solved / topic.attempted) * 100) : 0;

  const tagColors: Record<string, string> = {
    "dp": "var(--warning)",
    "graphs": "var(--success)",
    "math": "#7c3aed",
    "greedy": "var(--info)",
    "data structures": "var(--primary)",
    "strings": "#0d9488",
    "binary search": "#d97706",
  };

  const color = tagColors[topic.tag.toLowerCase()] || "var(--primary)";

  return (
    <div style={{ animationDelay: `${delay}ms` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>{topic.tag}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
          {topic.solved}/{topic.attempted} · {pct}%
        </span>
      </div>
      <div style={{ width: "100%", height: 6, borderRadius: 3, background: "var(--surface-high)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 3,
          background: color,
          transition: "width 0.8s ease",
        }} />
      </div>
    </div>
  );
}
