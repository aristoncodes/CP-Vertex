"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface CFRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export function RatingChart({ data = [] }: { data?: CFRatingChange[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="n-card" style={{ padding: "18px 22px", height: "100%", display: "flex", flexDirection: "column" }}>
        <div className="n-section-label">Rating History</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          No rating history available.
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.ratingUpdateTimeSeconds * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
    rating: d.newRating,
    oldRating: d.oldRating,
    contest: d.contestName,
    rank: d.rank,
    delta: d.newRating - d.oldRating,
  }));

  const maxRating = Math.max(...chartData.map(d => d.rating));
  const minRating = Math.min(...chartData.map(d => d.rating));

  // Determine standard CF color bands based on max rating for Y axis domain
  const yMax = Math.ceil((maxRating + 100) / 100) * 100;
  const yMin = Math.max(0, Math.floor((minRating - 100) / 100) * 100);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.delta >= 0;
      return (
        <div style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
          padding: "10px",
          borderRadius: "8px",
          fontSize: "12px",
          color: "var(--text-primary)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxWidth: "250px"
        }}>
          <div style={{ fontWeight: 800, marginBottom: "4px" }}>{d.contest}</div>
          <div style={{ color: "var(--text-muted)", marginBottom: "8px" }}>{d.date} • Rank {d.rank}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Rating: <strong>{d.rating}</strong></span>
            <span style={{ color: isPositive ? "var(--success)" : "var(--danger)", fontWeight: "bold" }}>
              {isPositive ? "+" : ""}{d.delta}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="n-card" style={{ padding: "18px 22px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="n-section-label" style={{ margin: 0 }}>Rating History</div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Max: <strong style={{ color: "var(--text-primary)" }}>{maxRating}</strong>
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 200, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              domain={[yMin, yMax]} 
              tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="rating" 
              stroke="var(--info)" 
              strokeWidth={3}
              dot={{ r: 3, fill: "var(--info)", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "white", stroke: "var(--info)", strokeWidth: 2 }}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
