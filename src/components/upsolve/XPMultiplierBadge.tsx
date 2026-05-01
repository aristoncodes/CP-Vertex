"use client"

interface XPMultiplierBadgeProps {
  multiplier: number
}

export function XPMultiplierBadge({ multiplier }: XPMultiplierBadgeProps) {
  const config =
    multiplier >= 2.0
      ? { label: "2×", bg: "#3B0010", border: "#FF2040", text: "#FF2040" }
      : multiplier >= 1.5
      ? { label: "1.5×", bg: "#2D1A00", border: "#F59E0B", text: "#F59E0B" }
      : multiplier >= 1.0
      ? { label: "1×", bg: "#1A1C28", border: "#6B7280", text: "#6B7280" }
      : multiplier >= 0.75
      ? { label: "0.75×", bg: "#111320", border: "#4B5563", text: "#4B5563" }
      : { label: "0.5×", bg: "#0A0B12", border: "#2A2D40", text: "#2A2D40" }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 4,
        background: config.bg,
        border: `1px solid ${config.border}`,
        fontSize: 11,
        fontWeight: 700,
        color: config.text,
        fontFamily: "Courier New, monospace",
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      {config.label} XP
    </span>
  )
}
