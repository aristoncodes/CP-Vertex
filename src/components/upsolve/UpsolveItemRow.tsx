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
  if (rating >= 2100) return "#7c3aed"
  if (rating >= 1900) return "var(--info)"
  if (rating >= 1600) return "var(--success)"
  if (rating >= 1400) return "var(--primary)"
  if (rating >= 1200) return "var(--warning)"
  return "var(--text-muted)"
}

function verdictChip(type: string, lastVerdict: string | null, attemptCount: number) {
  if (type === "never_attempted") {
    return (
      <span className="n-badge" style={{
        fontSize: 10,
        color: "var(--text-muted)",
        background: "var(--surface-low)",
        border: "1px solid var(--border)",
      }}>
        never attempted
      </span>
    )
  }
  const label = lastVerdict
    ? `${lastVerdict.replace("_", " ")} ×${attemptCount}`
    : `${attemptCount} attempts`
  const color = lastVerdict === "TIME_LIMIT_EXCEEDED" ? "var(--warning)"
    : lastVerdict === "WRONG_ANSWER" ? "var(--danger)"
    : lastVerdict === "MEMORY_LIMIT_EXCEEDED" ? "#7c3aed"
    : "var(--text-muted)"
  return (
    <span className="n-badge" style={{
      fontSize: 10,
      color,
      background: `${color}12`,
      border: `1px solid ${color}`,
    }}>
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
      className="n-card"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        borderLeft: `3px solid ${item.category === "target" ? "var(--danger)" : "var(--cat-geo)"}`,
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        background: highlight ? "var(--primary-light)" : undefined,
        borderColor: highlight ? "var(--primary)" : undefined,
      }}
    >
      {/* Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {showContest && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 3 }}>
            {item.contestParticipation.contestName}
            {item.contestParticipation.ratingChange !== null && (
              <span style={{ color: (item.contestParticipation.ratingChange || 0) >= 0 ? "var(--success)" : "var(--danger)", marginLeft: 6, fontWeight: 600 }}>
                {(item.contestParticipation.ratingChange || 0) >= 0 ? "+" : ""}{item.contestParticipation.ratingChange}
              </span>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {verdictChip(item.type, item.lastVerdict, item.attemptCount)}
          <a
            href={item.problem.cfLink}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            {item.problem.title}
          </a>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
          {item.problem.tags.slice(0, 3).map((t) => (
            <span
              key={t.tag.name}
              className="n-tag"
              style={{ fontSize: 10, padding: "2px 8px" }}
            >
              {t.tag.name}
            </span>
          ))}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span className="n-badge" style={{
          fontSize: 13,
          fontWeight: 800,
          background: `${ratingColor(item.problem.rating)}12`,
          color: ratingColor(item.problem.rating),
        }}>
          {item.problem.rating || "?"}
        </span>
        <XPMultiplierBadge multiplier={item.xpMultiplier} />
        <CountdownTimer deadlineAt={item.deadlineAt} xpMultiplier={item.xpMultiplier} />
      </div>

      {/* Arrow */}
      <span className="material-symbols-outlined" style={{ color: "var(--text-faint)", fontSize: 18, flexShrink: 0 }}>
        chevron_right
      </span>
    </div>
  )
}
