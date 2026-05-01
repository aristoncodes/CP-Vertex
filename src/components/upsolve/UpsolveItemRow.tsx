"use client"

import { useRouter } from "next/navigation"
import { CountdownTimer } from "./CountdownTimer"
import { XPMultiplierBadge } from "./XPMultiplierBadge"

interface UpsolveItemProps {
  item: {
    id: string
    type: string
    category: string
    status: string
    attemptCount: number
    lastVerdict: string | null
    xpMultiplier: number
    deadlineAt: string | Date
    problem: {
      id: string
      cfId: string
      title: string
      cfLink: string
      rating: number
      tags: Array<{ tag: { name: string } }>
    }
    contestParticipation: {
      contestName: string
      ratingChange: number | null
    }
  }
  showContest?: boolean
  onSkip?: (id: string) => void
  highlight?: boolean
}

function ratingColor(rating: number): string {
  if (rating >= 2400) return "#FF2040"
  if (rating >= 2100) return "#F97316"
  if (rating >= 1900) return "#F59E0B"
  if (rating >= 1600) return "#10B981"
  if (rating >= 1400) return "#00F0FF"
  if (rating >= 1200) return "#8B5CF6"
  return "#6B7280"
}

function verdictChip(type: string, lastVerdict: string | null, attemptCount: number) {
  if (type === "never_attempted") {
    return (
      <span style={{ fontSize: 10, color: "#4B5563", background: "#111320", border: "1px solid #1E2133", padding: "1px 6px", borderRadius: 3, fontFamily: "Courier New" }}>
        never attempted
      </span>
    )
  }
  const label = lastVerdict
    ? `${lastVerdict.replace("_", " ")} ×${attemptCount}`
    : `${attemptCount} attempts`
  const color = lastVerdict === "TIME_LIMIT_EXCEEDED" ? "#F59E0B"
    : lastVerdict === "WRONG_ANSWER" ? "#FF2040"
    : lastVerdict === "MEMORY_LIMIT_EXCEEDED" ? "#8B5CF6"
    : "#6B7280"
  return (
    <span style={{ fontSize: 10, color, background: "#06060A", border: `1px solid ${color}33`, padding: "1px 6px", borderRadius: 3, fontFamily: "Courier New" }}>
      {label}
    </span>
  )
}

export function UpsolveItemRow({ item, showContest, onSkip, highlight }: UpsolveItemProps) {
  const router = useRouter()

  return (
    <div
      id={`upsolve-${item.id}`}
      onClick={() => router.push(`/upsolve?highlight=${item.problem.id}`)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        background: highlight ? "#0D1020" : "#0C0D14",
        border: `1px solid ${highlight ? "#FF2040" : "#1E2133"}`,
        borderLeft: `3px solid ${item.category === "target" ? "#FF2040" : "#8B5CF6"}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = "#111320"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = highlight ? "#0D1020" : "#0C0D14"
      }}
    >
      {/* Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showContest && (
          <div style={{ fontSize: 10, color: "#6B7280", fontFamily: "Courier New", marginBottom: 3 }}>
            {item.contestParticipation.contestName}
            {item.contestParticipation.ratingChange !== null && (
              <span style={{ color: (item.contestParticipation.ratingChange || 0) >= 0 ? "#10B981" : "#FF2040", marginLeft: 6 }}>
                {(item.contestParticipation.ratingChange || 0) >= 0 ? "+" : ""}{item.contestParticipation.ratingChange}
              </span>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {verdictChip(item.type, item.lastVerdict, item.attemptCount)}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#F2F4FF",
              fontFamily: "Arial, sans-serif",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.problem.title}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {item.problem.tags.slice(0, 3).map((t) => (
            <span
              key={t.tag.name}
              style={{ fontSize: 10, color: "#6B7280", background: "#111320", border: "1px solid #1E2133", padding: "1px 6px", borderRadius: 3 }}
            >
              {t.tag.name}
            </span>
          ))}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: ratingColor(item.problem.rating) }}>
          {item.problem.rating}
        </span>
        <XPMultiplierBadge multiplier={item.xpMultiplier} />
        <CountdownTimer deadlineAt={item.deadlineAt} xpMultiplier={item.xpMultiplier} />
      </div>

      {/* Arrow */}
      <div style={{ color: "#2A2D40", fontSize: 18, flexShrink: 0 }}>›</div>
    </div>
  )
}
