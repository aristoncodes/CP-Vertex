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
  if (rating >= 2400) return "var(--danger)"
  if (rating >= 2100) return "var(--warning)"
  if (rating >= 1900) return "#F59E0B"
  if (rating >= 1600) return "var(--success)"
  if (rating >= 1400) return "var(--primary)"
  if (rating >= 1200) return "#8B5CF6"
  return "var(--text-muted)"
}

function verdictChip(type: string, lastVerdict: string | null, attemptCount: number) {
  if (type === "never_attempted") {
    return (
      <span style={{ fontSize: 10, color: "var(--text-secondary)", background: "var(--surface-high)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 3, fontFamily: "'Courier New', monospace" }}>
        never attempted
      </span>
    )
  }
  const label = lastVerdict
    ? `${lastVerdict.replace("_", " ")} ×${attemptCount}`
    : `${attemptCount} attempts`
  const color = lastVerdict === "TIME_LIMIT_EXCEEDED" ? "var(--warning)"
    : lastVerdict === "WRONG_ANSWER" ? "var(--danger)"
    : lastVerdict === "MEMORY_LIMIT_EXCEEDED" ? "#8B5CF6"
    : "var(--text-muted)"
  return (
    <span style={{ fontSize: 10, color, background: "var(--surface-highest)", border: `1px solid ${color}`, padding: "1px 6px", borderRadius: 3, fontFamily: "'Courier New', monospace" }}>
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
        background: highlight ? "var(--primary-light)" : "var(--surface-card)",
        border: `1px solid ${highlight ? "var(--primary)" : "var(--border)"}`,
        borderLeft: `3px solid ${item.category === "target" ? "var(--danger)" : "#8B5CF6"}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "background 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = highlight ? "var(--primary-light)" : "var(--surface-card)"
      }}
    >
      {/* Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showContest && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'Courier New', monospace", marginBottom: 3 }}>
            {item.contestParticipation.contestName}
            {item.contestParticipation.ratingChange !== null && (
              <span style={{ color: (item.contestParticipation.ratingChange || 0) >= 0 ? "var(--success)" : "var(--danger)", marginLeft: 6 }}>
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
              color: "var(--text-primary)",
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
              style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--surface-high)", border: "1px solid var(--border)", padding: "1px 6px", borderRadius: 3 }}
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
      <div style={{ color: "var(--text-muted)", fontSize: 18, flexShrink: 0 }}>›</div>
    </div>
  )
}
