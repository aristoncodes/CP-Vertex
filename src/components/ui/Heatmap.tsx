"use client";

import { useState } from "react";
import { getRatingColor, getRatingTierName } from "@/lib/colors";

interface HeatmapEntry {
  date: string;
  count: number;
  xpCount?: number;
  maxRating?: number;
}

interface HeatmapStats {
  solvedAllTime: number;
  solvedLastYear: number;
  solvedLastMonth: number;
  streakMax: number;
  streakLastYear: number;
  streakLastMonth: number;
}

interface CellData {
  date: string;
  count: number;
  maxRating: number;
  isFuture: boolean;
}

const CF_GREENS = ["#9be9a8", "#40c463", "#30a14e", "#216e39"];
const EMPTY = "var(--surface-high)";
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

// Local-time YYYY-MM-DD (matches the IST-derived keys the API emits far better
// than UTC toISOString, which shifts late-night solves to the wrong day).
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildWeeks(data: HeatmapEntry[]): { weeks: CellData[][]; monthLabels: { label: string; weekIndex: number }[] } {
  const map = new Map<string, { count: number; maxRating: number }>();
  data.forEach((d) => map.set(d.date, { count: d.count, maxRating: d.maxRating || 0 }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // align to Sunday

  const weeks: CellData[][] = [];
  const monthLabels: { label: string; weekIndex: number }[] = [];
  const seenMonths = new Set<string>();
  const cursor = new Date(startDate);
  let weekIdx = 0;

  // Build one week at a time as long as the week's first day is on/before today.
  // This stops exactly at the week containing today — no trailing empty column,
  // and the current week fills in as each day arrives.
  while (cursor <= today) {
    const week: CellData[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = dayKey(cursor);
      const isFuture = cursor > today;
      const entry = map.get(dateStr);
      if (!isFuture && d === 0) {
        const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);
          monthLabels.push({ label: cursor.toLocaleString("en-US", { month: "short" }), weekIndex: weekIdx });
        }
      }
      week.push({ date: dateStr, count: entry?.count || 0, maxRating: entry?.maxRating || 0, isFuture });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    weekIdx++;
  }
  return { weeks, monthLabels };
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** Shared grid renderer; colorFn maps a cell to a background. */
function HeatGrid({
  weeks, monthLabels, colorFn, tipFn,
}: {
  weeks: CellData[][];
  monthLabels: { label: string; weekIndex: number }[];
  colorFn: (c: CellData) => string;
  tipFn: (c: CellData) => string;
}) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  return (
    <div style={{ position: "relative" }}>
      {/* Month labels */}
      <div style={{ display: "flex", marginLeft: 28, marginBottom: 2 }}>
        {weeks.map((_, wi) => {
          const label = monthLabels.find((m) => m.weekIndex === wi);
          return <div key={wi} style={{ flex: 1, fontSize: 10, color: "var(--text-muted)", fontWeight: 500, userSelect: "none" }}>{label ? label.label : ""}</div>;
        })}
      </div>
      <div style={{ display: "flex", width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", marginRight: 4, width: 24, flexShrink: 0, gap: 3 }}>
          {DAY_LABELS.map((label, i) => (
            <div key={i} style={{ flex: 1, fontSize: 9, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 2, fontWeight: 500 }}>{label}</div>
          ))}
        </div>
        <div style={{ display: "flex", flex: 1, gap: 3 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  style={{
                    width: "100%", aspectRatio: "1 / 1", borderRadius: 2,
                    background: colorFn(cell),
                    cursor: cell.count > 0 ? "pointer" : "default",
                    outline: cell.count === 0 && !cell.isFuture ? "1px solid var(--border)" : "none",
                    outlineOffset: -1,
                  }}
                  onMouseEnter={(e) => {
                    if (cell.isFuture) return;
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    const container = (e.target as HTMLElement).closest(".n-card")!.getBoundingClientRect();
                    setTooltip({ text: tipFn(cell), x: rect.left - container.left + rect.width / 2, y: rect.top - container.top - 8 });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {tooltip && (
        <div style={{
          position: "absolute", left: tooltip.x, top: tooltip.y, transform: "translate(-50%, -100%)",
          background: "var(--surface-card)", color: "var(--text-primary)", padding: "5px 10px",
          borderRadius: "var(--radius-sm)", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap",
          pointerEvents: "none", zIndex: 50, border: "1px solid var(--border)", boxShadow: "var(--shadow-md)",
        }}>{tooltip.text}</div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export function Heatmap({ data = [], stats }: { data?: HeatmapEntry[]; stats?: HeatmapStats }) {
  const { weeks, monthLabels } = buildWeeks(data);

  const greenColor = (c: CellData): string => {
    if (c.isFuture || c.count === 0) return EMPTY;
    const tier = c.count >= 7 ? 3 : c.count >= 4 ? 2 : c.count >= 2 ? 1 : 0;
    return CF_GREENS[tier];
  };
  const ratingColor = (c: CellData): string => {
    if (c.isFuture || c.count === 0 || c.maxRating === 0) return EMPTY;
    return getRatingColor(c.maxRating);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Activity heatmap + stats */}
      <div className="n-card">
        <div className="n-section-label">Activity</div>
        <HeatGrid
          weeks={weeks} monthLabels={monthLabels} colorFn={greenColor}
          tipFn={(c) => (c.count === 0 ? `No solves on ${formatDate(c.date)}` : `${c.count} solved on ${formatDate(c.date)}`)}
        />
        {/* Legend */}
        <div style={{ display: "flex", gap: 3, marginTop: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 4 }}>Less</span>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: EMPTY, outline: "1px solid var(--border)", outlineOffset: -1 }} />
          {CF_GREENS.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)}
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>More</span>
        </div>

        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <Stat value={stats.solvedAllTime.toLocaleString()} label="solved all time" />
            <Stat value={stats.solvedLastYear.toLocaleString()} label="solved last year" />
            <Stat value={stats.solvedLastMonth.toLocaleString()} label="solved last month" />
            <Stat value={`${stats.streakMax}d`} label="longest streak ever" />
            <Stat value={`${stats.streakLastYear}d`} label="longest streak, year" />
            <Stat value={`${stats.streakLastMonth}d`} label="longest streak, month" />
          </div>
        )}
      </div>

      {/* Rating-based heatmap */}
      <div className="n-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div className="n-section-label" style={{ marginBottom: 0 }}>Rating-based heatmap</div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>colored by hardest problem solved each day</span>
        </div>
        <HeatGrid
          weeks={weeks} monthLabels={monthLabels} colorFn={ratingColor}
          tipFn={(c) => (c.count === 0 || c.maxRating === 0 ? `No rated solves on ${formatDate(c.date)}` : `Top ${c.maxRating} (${getRatingTierName(c.maxRating)}) on ${formatDate(c.date)}`)}
        />
      </div>
    </div>
  );
}
