"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
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

/* CF rating band thresholds */
const BANDS = [
  { value: 1200, label: "Pupil", color: "#22c55e" },
  { value: 1400, label: "Specialist", color: "#06b6d4" },
  { value: 1600, label: "Expert", color: "#3b82f6" },
  { value: 1900, label: "CM", color: "#a855f7" },
  { value: 2100, label: "Master", color: "#FF8C00" },
  { value: 2400, label: "GM", color: "#dc2626" },
];

function getRankColor(rating: number): string {
  if (rating >= 2400) return "#dc2626";  // GM — red
  if (rating >= 2100) return "#FF8C00";  // Master — orange
  if (rating >= 1900) return "#a855f7";  // CM — purple
  if (rating >= 1600) return "#3b82f6";  // Expert — blue
  if (rating >= 1400) return "#06b6d4";  // Specialist — cyan
  if (rating >= 1200) return "#22c55e";  // Pupil — green
  return "#6b7280";                       // Newbie — grey
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
    date: new Date(d.ratingUpdateTimeSeconds * 1000).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
    rating: d.newRating,
    oldRating: d.oldRating,
    contest: d.contestName,
    rank: d.rank,
    delta: d.newRating - d.oldRating,
  }));

  const maxRating = Math.max(...chartData.map(d => d.rating));
  const minRating = Math.min(...chartData.map(d => d.rating));
  const currentRating = chartData[chartData.length - 1]?.rating || 0;

  // Y axis domain with padding
  const yMax = Math.ceil((maxRating + 150) / 100) * 100;
  const yMin = Math.max(0, Math.floor((minRating - 150) / 100) * 100);

  // Only show bands within the visible Y range
  const visibleBands = BANDS.filter(b => b.value >= yMin && b.value <= yMax);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.delta >= 0;
      return (
        <div style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
          padding: "10px 12px",
          borderRadius: "10px",
          fontSize: "12px",
          color: "var(--text-primary)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          maxWidth: "250px",
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: "4px", fontSize: 13 }}>{d.contest}</div>
          <div style={{ color: "var(--text-muted)", marginBottom: "6px", fontSize: 11 }}>{d.date} · Rank #{d.rank}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
            <span>Rating: <strong style={{ fontSize: 15 }}>{d.rating}</strong></span>
            <span style={{
              color: isPositive ? "var(--success)" : "var(--danger)",
              fontWeight: 700,
              fontSize: 13,
              background: isPositive ? "var(--success-light)" : "var(--danger-light)",
              padding: "2px 8px",
              borderRadius: 6,
            }}>
              {isPositive ? "+" : ""}{d.delta}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="n-card" style={{ padding: "18px 22px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div className="n-section-label" style={{ margin: 0 }}>Rating History</div>
        <div style={{ display: "flex", gap: 16, fontSize: "12px", color: "var(--text-muted)" }}>
          <span>Current: <strong style={{ color: getRankColor(currentRating) }}>{currentRating}</strong></span>
          <span>Peak: <strong style={{ color: getRankColor(maxRating) }}>{maxRating}</strong></span>
        </div>
      </div>
      
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--info)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis 
              domain={[yMin, yMax]} 
              tick={{ fontSize: 10, fill: "var(--text-muted)" }} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* CF-style rating band lines */}
            {visibleBands.map(band => (
              <ReferenceLine
                key={band.value}
                y={band.value}
                stroke={band.color}
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                label={{
                  value: band.label,
                  position: "right",
                  fontSize: 9,
                  fill: band.color,
                  fontWeight: 600,
                }}
              />
            ))}
            <Area
              type="monotone"
              dataKey="rating"
              stroke="var(--info)"
              strokeWidth={2.5}
              fill="url(#ratingGrad)"
              dot={{ r: 3, fill: "var(--info)", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "var(--surface-card)", stroke: "var(--info)", strokeWidth: 2.5 }}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
