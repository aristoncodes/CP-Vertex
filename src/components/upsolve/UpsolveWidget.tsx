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
      <div style={{ padding: "16px 0" }}>
        <div className="n-section-label">Upsolve Queue</div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
          Loading...
        </div>
      </div>
    )
  }

  if (!data || data.pendingCount === 0) {
    return (
      <div style={{ padding: "16px 0" }}>
        <div className="n-section-label">Upsolve Queue</div>
        <div
          style={{
            background: "#0C0D14",
            border: "1px solid #1E2133",
            borderRadius: 8,
            padding: "20px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13, color: "#6B7280", fontFamily: "Courier New" }}>
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
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#FF2040",
              color: "#fff",
              fontSize: 10,
              fontWeight: 800,
              fontFamily: "Courier New",
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
          background: "#06060A",
          border: "1px solid #1E2133",
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "Courier New" }}>
          {data.expiringCount > 0 && (
            <span style={{ color: "#FF2040" }}>{data.expiringCount} expiring &lt;24h · </span>
          )}
          <span style={{ color: "#F59E0B" }}>
            {data.totalXP.toLocaleString()} XP waiting
          </span>
        </span>
        <button
          onClick={() => router.push("/upsolve")}
          style={{
            fontSize: 11,
            color: "#FF2040",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "Courier New",
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
