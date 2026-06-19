"use client";

import { useState } from "react";

interface HeatmapEntry {
  date: string;
  count: number;
  xpCount?: number;
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

  // ── Color logic ─────────────────────────────
  // Classic Codeforces green gradient for pure-CF solves
  // Activity that earned XP natively on CodeArena gets darker / more saturated
  const CF_GREENS = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const EMPTY = "var(--surface-high)";

  const getCellColor = (cell: CellData): string => {
    if (cell.isFuture || cell.count === 0) return EMPTY;
    // Map count to intensity tier: 1 → 0, 2-3 → 1, 4-6 → 2, 7+ → 3
    const tier =
      cell.count >= 7 ? 3 :
      cell.count >= 4 ? 2 :
      cell.count >= 2 ? 1 : 0;
    return CF_GREENS[tier];
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div className="n-card" style={{ padding: "16px 20px", position: "relative" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="n-section-label" style={{ marginBottom: 0 }}>Activity</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{totalSolves.toLocaleString()}</strong> solves this year
        </div>
      </div>

      {/* Month labels row */}
      <div style={{ display: "flex", marginLeft: 28, marginBottom: 2, gap: 0 }}>
        {weeks.map((_, wi) => {
          const label = monthLabels.find(m => m.weekIndex === wi);
          return (
            <div
              key={wi}
              style={{
                flex: 1,
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 500,
                userSelect: "none",
              }}
            >
              {label ? label.label : ""}
            </div>
          );
        })}
      </div>

      {/* Grid area */}
      <div style={{ display: "flex", width: "100%" }}>
        {/* Day-of-week axis */}
        <div style={{ display: "flex", flexDirection: "column", marginRight: 4, width: 24, flexShrink: 0, gap: "3px" }}>
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                fontSize: 9,
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 2,
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Cell columns */}
        <div style={{ display: "flex", flex: 1, gap: "3px" }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 2,
                    background: getCellColor(cell),
                    cursor: cell.count > 0 ? "pointer" : "default",
                    transition: "opacity 0.15s",
                    outline: cell.count === 0 && !cell.isFuture ? "1px solid var(--border)" : "none",
                    outlineOffset: -1,
                  }}
                  onMouseEnter={(e) => {
                    if (cell.isFuture) return;
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    const container = (e.target as HTMLElement).closest(".n-card")!.getBoundingClientRect();
                    setTooltip({
                      text: cell.count === 0
                        ? `No solves on ${formatDate(cell.date)}`
                        : `${cell.count} solve${cell.count !== 1 ? "s" : ""} on ${formatDate(cell.date)}`,
                      x: rect.left - container.left + (rect.width / 2),
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

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x,
          top: tooltip.y,
          transform: "translate(-50%, -100%)",
          background: "var(--surface-elevated)",
          color: "var(--text-primary)",
          padding: "5px 10px",
          borderRadius: "var(--radius-sm)",
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 50,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}>
          {tooltip.text}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 3, marginTop: 10, alignItems: "center", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 4, fontWeight: 500 }}>Less</span>
        <div style={{ width: 10, height: 10, borderRadius: 2, background: EMPTY, outline: "1px solid var(--border)", outlineOffset: -1 }} />
        {CF_GREENS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4, fontWeight: 500 }}>More</span>
      </div>
    </div>
  );
}
