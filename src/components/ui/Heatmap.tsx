"use client";

import { useState } from "react";

interface HeatmapEntry {
  date: string;
  count: number;
  xpCount?: number; // solves done natively on CodeArena (xpAwarded > 0)
}

interface CellData {
  date: string;
  count: number;
  xpCount: number;
  isFuture: boolean;
}

export function Heatmap({ data = [] }: { data?: HeatmapEntry[] }) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Build lookup map
  const countMap = new Map<string, { count: number; xpCount: number }>();
  data.forEach(d => countMap.set(d.date, { count: d.count, xpCount: d.xpCount || 0 }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from Sunday of the week 52 weeks ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Build 53 weeks of columns
  const weeks: CellData[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  let seenMonths = new Set<string>();

  const cursor = new Date(startDate);
  let weekIdx = 0;
  while (cursor <= today || weeks.length < 53) {
    const week: CellData[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split("T")[0];
      const isFuture = cursor > today;
      const entry = countMap.get(dateStr);

      // Month label tracking
      if (!isFuture && d === 0) {
        const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);
          monthLabels.push({
            label: cursor.toLocaleString("en-US", { month: "short" }),
            weekIndex: weekIdx,
          });
        }
      }

      week.push({
        date: dateStr,
        count: entry?.count || 0,
        xpCount: entry?.xpCount || 0,
        isFuture,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    weekIdx++;
    if (cursor > today && weeks.length >= 52) break;
  }

  const totalSolves = data.reduce((sum, d) => sum + d.count, 0);
  const arenaSolves = data.reduce((sum, d) => sum + (d.xpCount || 0), 0);

  // Color logic: CodeArena solves = green, CF-only = blue
  const getCellColor = (cell: CellData) => {
    if (cell.isFuture || cell.count === 0) return "#ebedf0";
    const isArena = cell.xpCount > 0;
    const intensity = Math.min(cell.count, 6);
    if (isArena) {
      // Green gradient for CodeArena solves
      const greens = ["#9be9a8", "#40c463", "#30a14e", "#216e39", "#0d4821"];
      return greens[Math.min(Math.floor(intensity / 1.2), 4)];
    } else {
      // Blue gradient for Codeforces synced solves
      const blues = ["#bee3f8", "#63b3ed", "#3182ce", "#2b6cb0", "#1a365d"];
      return blues[Math.min(Math.floor(intensity / 1.2), 4)];
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SHOW_DAYS = [1, 3, 5]; // Mon, Wed, Fri

  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;

  return (
    <div className="n-card" style={{ padding: "16px 20px" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div className="n-section-label" style={{ marginBottom: 0 }}>Activity</div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
          <span><strong style={{ color: "var(--text-primary)" }}>{totalSolves.toLocaleString()}</strong> solves this year</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#30a14e", display: "inline-block" }} />
            <span style={{ color: "var(--text-muted)" }}>CodeArena</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: "#3182ce", display: "inline-block" }} />
            <span style={{ color: "var(--text-muted)" }}>Codeforces</span>
          </span>
        </div>
      </div>

      {/* Heatmap grid */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ display: "inline-flex", flexDirection: "column", position: "relative" }}>

          {/* Month labels */}
          <div style={{ display: "flex", marginLeft: 28, marginBottom: 4 }}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find(m => m.weekIndex === wi);
              return (
                <div key={wi} style={{ width: STEP, flexShrink: 0, fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                  {label ? label.label : ""}
                </div>
              );
            })}
          </div>

          {/* Day labels + cells */}
          <div style={{ display: "flex", gap: 0 }}>
            {/* Day-of-week axis */}
            <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 4, width: 24 }}>
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <div key={d} style={{
                  height: CELL,
                  fontSize: 9,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: 2,
                  visibility: SHOW_DAYS.includes(d) ? "visible" : "hidden",
                }}>
                  {DAY_LABELS[d]}
                </div>
              ))}
            </div>

            {/* Columns of cells */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: GAP }}>
                {week.map((cell, di) => (
                  <div
                    key={di}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 2,
                      background: getCellColor(cell),
                      cursor: cell.count > 0 ? "pointer" : "default",
                      transition: "transform 0.1s, opacity 0.1s",
                      border: cell.count > 0 ? "none" : "1px solid rgba(0,0,0,0.06)",
                    }}
                    onMouseEnter={(e) => {
                      if (cell.isFuture) return;
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      const container = (e.target as HTMLElement).closest(".n-card")!.getBoundingClientRect();
                      const sourceLabel = cell.xpCount > 0
                        ? `${cell.xpCount} CodeArena + ${cell.count - cell.xpCount} CF`
                        : `${cell.count} Codeforces`;
                      setTooltip({
                        text: cell.count === 0
                          ? `No solves on ${formatDate(cell.date)}`
                          : `${cell.count} solve${cell.count !== 1 ? "s" : ""} on ${formatDate(cell.date)} (${sourceLabel})`,
                        x: rect.left - container.left + CELL / 2,
                        y: rect.top - container.top - 8,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -100%)",
          background: "#1a1a2e",
          color: "white",
          padding: "5px 10px",
          borderRadius: 6,
          fontSize: 11,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 50,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}>
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 4, marginTop: 12, alignItems: "center", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 4 }}>Less</span>
        {["#ebedf0", "#bee3f8", "#63b3ed", "#3182ce", "#1a365d"].map((c, i) => (
          <div key={i} style={{ width: CELL, height: CELL, borderRadius: 2, background: c, border: i === 0 ? "1px solid rgba(0,0,0,0.06)" : "none" }} />
        ))}
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4, marginRight: 12 }}>More (CF)</span>
        {["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#0d4821"].map((c, i) => (
          <div key={i} style={{ width: CELL, height: CELL, borderRadius: 2, background: c, border: i === 0 ? "1px solid rgba(0,0,0,0.06)" : "none" }} />
        ))}
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>More (Arena)</span>
      </div>
    </div>
  );
}
