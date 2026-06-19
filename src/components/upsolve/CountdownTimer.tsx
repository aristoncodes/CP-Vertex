"use client"

import { useEffect, useState } from "react"

interface CountdownTimerProps {
  deadlineAt: string | Date
  xpMultiplier: number
}

function formatCountdown(ms: number): { text: string; urgency: "high" | "medium" | "low" | "expired" } {
  if (ms <= 0) return { text: "Expired", urgency: "expired" }

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  const days = Math.floor(hours / 24)
  const remHours = hours % 24

  if (hours < 24) {
    const h = String(hours).padStart(2, "0")
    const m = String(minutes).padStart(2, "0")
    const s = String(seconds).padStart(2, "0")
    return { text: `${h}:${m}:${s}`, urgency: "high" }
  }
  if (days < 7) {
    return { text: `${days}d ${remHours}h`, urgency: "medium" }
  }
  return { text: `${days}d`, urgency: "low" }
}

export function CountdownTimer({ deadlineAt, xpMultiplier }: CountdownTimerProps) {
  const deadline = new Date(deadlineAt).getTime()
  const [ms, setMs] = useState(deadline - Date.now())

  useEffect(() => {
    const tick = setInterval(() => setMs(deadline - Date.now()), 1000)
    return () => clearInterval(tick)
  }, [deadline])

  const { text, urgency } = formatCountdown(ms)

  const colors: Record<string, string> = {
    high: "var(--danger)",
    medium: "var(--warning)",
    low: "var(--text-muted)",
    expired: "var(--text-faint)",
  }

  const color = colors[urgency]

  if (urgency === "expired" || xpMultiplier <= 0.5) {
    return (
      <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 500 }}>
        Graveyard
      </span>
    )
  }

  return (
    <span
      style={{
        fontSize: 10,
        color,
        fontVariantNumeric: "tabular-nums",
        fontWeight: urgency === "high" ? 700 : 500,
        animation: urgency === "high" ? "pulse 2s ease-in-out infinite" : "none",
      }}
    >
      {text}
    </span>
  )
}
