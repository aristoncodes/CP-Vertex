"use client"

interface XPMultiplierBadgeProps {
  multiplier: number
}

export function XPMultiplierBadge({ multiplier }: XPMultiplierBadgeProps) {
  const config =
    multiplier >= 2.0
      ? { label: "2×", color: "var(--danger)", bg: "var(--danger-light)" }
      : multiplier >= 1.5
      ? { label: "1.5×", color: "var(--warning)", bg: "var(--warning-light)" }
      : multiplier >= 1.0
      ? { label: "1×", color: "var(--text-muted)", bg: "var(--surface-high)" }
      : multiplier >= 0.75
      ? { label: "0.75×", color: "var(--text-faint)", bg: "var(--surface-high)" }
      : { label: "0.5×", color: "var(--text-faint)", bg: "var(--surface-high)" }

  return (
    <span
      className="n-badge"
      style={{
        background: config.bg,
        border: `1px solid ${config.color}`,
        fontSize: 10,
        fontWeight: 700,
        color: config.color,
        padding: "2px 7px",
      }}
    >
      {config.label} XP
    </span>
  )
}
