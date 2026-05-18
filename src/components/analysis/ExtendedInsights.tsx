"use client";

import { useExtendedAnalytics } from "@/hooks/useExtendedAnalytics";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell
} from "recharts";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height, borderRadius: 8 }} />;
}

export function ExtendedInsights({ handle, refreshKey }: { handle: string; refreshKey: number }) {
  const {
    ratingHistory, trendLine, consistencyScore, longestGreenStreak, currentGreenStreak,
    languageStats, timeOfDayStats, divisionStats, difficultyCeiling,
    solveTimeDist, loading, error
  } = useExtendedAnalytics(handle, refreshKey);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Skeleton width="100%" height={300} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Skeleton width="100%" height={200} />
          <Skeleton width="100%" height={200} />
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: "var(--text-muted)", padding: "20px 0" }}>Failed to load insights: {error}</div>;
  }

  // Combine trend and actual history for the chart
  const chartData = ratingHistory.map((h, i) => ({
    ...h,
    expectedRating: trendLine[i]?.expectedRating
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
      
      {/* 1. Rating Trajectory */}
      <div className="n-card" style={{ padding: "20px 24px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Rating Trajectory & Trend</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text-muted)", marginBottom: 4 }}
              />
              <Line type="monotone" dataKey="rating" stroke="#5B4FD4" strokeWidth={3} dot={{ r: 3, fill: "#5B4FD4" }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="expectedRating" stroke="var(--text-muted)" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* 2. Consistency & Streak */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Consistency Score</h3>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 600, color: consistencyScore > 50 ? "#3B6D11" : "#A32D2D" }}>{consistencyScore}%</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Positive Contests</div>
            </div>
            <div style={{ width: 1, background: "var(--border)" }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 500, color: "var(--text-primary)" }}>{currentGreenStreak} <span style={{fontSize:14, color:"var(--text-muted)"}}>current</span></div>
              <div style={{ fontSize: 24, fontWeight: 500, color: "var(--text-primary)" }}>{longestGreenStreak} <span style={{fontSize:14, color:"var(--text-muted)"}}>max</span></div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Green Streak (Contests)</div>
            </div>
          </div>
        </div>

        {/* 4. Language Stats */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Language Preference</h3>
          {languageStats.map(lang => (
            <div key={lang.language} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--text-primary)" }}>{lang.language}</span>
                <span style={{ color: "var(--text-muted)" }}>{lang.percentage}% ({lang.count} AC)</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "var(--surface-low)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${lang.percentage}%`, height: "100%", background: "#5B4FD4" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* 9. Solve Time Dist */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Solve Time Distribution</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={solveTimeDist} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-low)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#5B4FD4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Time of Day Performance */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Time of Day Performance</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeOfDayStats} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(h) => `${h}:00`} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--surface-low)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="ratingDelta" radius={[4, 4, 0, 0]}>
                  {timeOfDayStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.ratingDelta >= 0 ? "#3B6D11" : "#A32D2D"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* 6. Division Breakdown */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Division Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {divisionStats.map(d => (
              <div key={d.div} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{d.div}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.contests} contests</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: d.avgDelta >= 0 ? "#3B6D11" : "#A32D2D" }}>{d.avgDelta >= 0 ? "+" : ""}{d.avgDelta} avg Δ</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.winRate}% positive</div>
                </div>
              </div>
            ))}
            {divisionStats.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No division data available.</div>}
          </div>
        </div>

        {/* 7. Problem Difficulty Ceiling */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>Difficulty Ceiling (Max Rating Solved)</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {difficultyCeiling.map(c => (
              <div key={c.tag} style={{ padding: "6px 12px", borderRadius: 20, background: "var(--surface-low)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>{c.tag}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{c.maxRating}</span>
              </div>
            ))}
            {difficultyCeiling.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "20px 0", width: "100%" }}>No rated problem data available.</div>}
          </div>
        </div>
      </div>

    </div>
  );
}
