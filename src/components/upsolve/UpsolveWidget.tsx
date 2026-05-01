"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { UpsolveItemRow } from "./UpsolveItemRow"

interface UpsolveItem {
  id: string
  type: string
  category: string
  status: string
  attemptCount: number
  lastVerdict: string | null
  xpMultiplier: number
  deadlineAt: string
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

interface SummaryData {
  pendingCount: number
  expiringCount: number
  totalXP: number
  items: UpsolveItem[]
}

export function UpsolveWidget() {
  const router = useRouter()
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/upsolve/summary")
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="n-section-label">Upsolve Queue</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
          <div className="n-skeleton" style={{ height: 48, borderRadius: "var(--radius-sm)" }} />
          <div className="n-skeleton" style={{ height: 48, borderRadius: "var(--radius-sm)" }} />
        </div>
      </div>
    )
  }

  if (!data || data.pendingCount === 0) {
    return (
      <div>
        <div className="n-section-label">Upsolve Queue</div>
        <div
          style={{
            padding: "20px 16px",
            textAlign: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{
            fontSize: 28,
            color: "var(--success)",
            fontVariationSettings: "'FILL' 1",
            marginBottom: 8,
            display: "block",
          }}>check_circle</span>
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            {data ? "All caught up! No pending upsolves." : "Participate in a rated contest to start."}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="n-section-label" style={{ marginBottom: 0 }}>Upsolve Queue</div>
          <span
            className="n-badge"
            style={{
              background: "var(--danger)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: "var(--radius-full)",
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {data.pendingCount}
          </span>
        </div>
      </div>

      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.items.map((item) => (
          <UpsolveItemRow
            key={item.id}
            item={item}
            showContest={true}
          />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          padding: "8px 12px",
          background: "var(--surface-low)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
          {data.expiringCount > 0 && (
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>{data.expiringCount} expiring &lt;24h · </span>
          )}
          <span style={{ color: "var(--warning)", fontWeight: 600 }}>
            {data.totalXP.toLocaleString()} XP waiting
          </span>
        </span>
        <button
          onClick={() => router.push("/upsolve")}
          style={{
            fontSize: 11,
            color: "var(--primary)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            padding: 0,
          }}
        >
          Open queue →
        </button>
      </div>
    </div>
  )
}
