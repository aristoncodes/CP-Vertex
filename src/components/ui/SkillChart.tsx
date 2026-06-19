"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface Topic {
  tag: string;
  solved: number;
  attempted: number;
  score: number;
  trend: "up" | "down" | "flat";
}

const TOPIC_COLORS: Record<string, string> = {
  "dp": "#d97706", "graphs": "#059669", "math": "#7c3aed",
  "greedy": "#0891b2", "data structures": "#0366d6", "strings": "#0d9488",
  "binary search": "#f59e0b", "implementation": "#6366f1", "sorting": "#8b5cf6",
  "number theory": "#ec4899", "combinatorics": "#f97316", "geometry": "#14b8a6",
  "brute force": "#64748b", "trees": "#22c55e",
};

export function SkillChart({ topics = [] }: { topics?: Topic[] }) {
  if (!topics || topics.length === 0) {
    return (
      <div className="n-card" style={{ padding: "18px 22px", height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="n-section-label">Skill Assessment</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          No topic data available.
        </div>
      </div>
    );
  }

  // Sort by solved count and take top 12
  const sorted = [...topics].sort((a, b) => (b.solved || 0) - (a.solved || 0)).slice(0, 12);
  
  const chartData = sorted.map(t => ({
    ...t,
    acRate: t.attempted > 0 ? Math.round((t.solved / t.attempted) * 100) : 0,
    color: TOPIC_COLORS[t.tag.toLowerCase()] || "var(--primary)"
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
          padding: "10px",
          borderRadius: "8px",
          fontSize: "12px",
          color: "var(--text-primary)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          minWidth: "150px"
        }}>
          <div style={{ fontWeight: 800, marginBottom: "8px", textTransform: "capitalize" }}>{d.tag}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "var(--text-muted)" }}>Solved</span>
            <span style={{ fontWeight: 600 }}>{d.solved} / {d.attempted}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "var(--text-muted)" }}>AC Rate</span>
            <span style={{ fontWeight: 600 }}>{d.acRate}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)" }}>Level Score</span>
            <span style={{ fontWeight: 600 }}>{Math.round(d.score)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="n-card" style={{ padding: "18px 22px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="n-section-label" style={{ margin: 0 }}>Skill Assessment</div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          top {sorted.length} topics
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 220, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="tag" 
              tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-high)", opacity: 0.5 }} />
            <Bar dataKey="solved" radius={[4, 4, 0, 0]} animationDuration={1000}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
