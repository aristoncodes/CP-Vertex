"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { UpsolveItemRow } from "@/components/upsolve/UpsolveItemRow"

// ── Types ────────────────────────────────────────────────────────
interface Tag { name: string }
interface Problem {
  id: string
  cfId: string
  title: string
  cfLink: string
  rating: number
  tags: Array<{ tag: Tag }>
}
interface ContestParticipation {
  id: string
  contestId: number
  contestName: string
  division: number | null
  ratingChange: number | null
  participatedAt: string
}
interface UpsolveItem {
  id: string
  type: string
  category: string
  status: string
  attemptCount: number
  lastVerdict: string | null
  xpMultiplier: number
  deadlineAt: string
  problem: Problem
  contestParticipation: ContestParticipation
}
interface Settings {
  div1Target: string
  div2Target: string
  div3Target: string
  div4Target: string
  autoAdjust: boolean
}

// ── Target Badge ─────────────────────────────────────────────────
function TargetBadge({ settings, onEdit }: { settings: Settings; onEdit: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
      {[
        { label: "Div 1", value: settings.div1Target },
        { label: "Div 2", value: settings.div2Target },
        { label: "Div 3", value: settings.div3Target },
        { label: "Div 4", value: settings.div4Target },
      ].map(({ label, value }) => (
        <span
          key={label}
          style={{
            padding: "4px 12px",
            background: "var(--surface-high)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "'Courier New', monospace",
            color: "var(--text-primary)",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>{label}: </span>
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>{value.toUpperCase()}</span>
        </span>
      ))}
      <button
        onClick={onEdit}
        style={{
          padding: "4px 12px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: "'Courier New', monospace",
          color: "var(--danger)",
          cursor: "pointer",
        }}
      >
        ✎ Edit Targets
      </button>
      {settings.autoAdjust && (
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Courier New', monospace" }}>
          · auto-adjust on
        </span>
      )}
    </div>
  )
}

// ── Settings Popover ─────────────────────────────────────────────
const TARGET_OPTIONS = ["none", "A-A", "A-B", "A-C", "A-D", "A-E", "A-F", "all"]

function SettingsPopover({
  settings,
  onSave,
  onClose,
}: {
  settings: Settings
  onSave: (s: Settings) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<Settings>(settings)

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="n-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 28,
          width: 380,
          maxWidth: "90vw",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Arial", marginBottom: 20 }}>
          Division Targets
        </div>
        {[
          { label: "Div 1", key: "div1Target" as const },
          { label: "Div 2", key: "div2Target" as const },
          { label: "Div 3", key: "div3Target" as const },
          { label: "Div 4", key: "div4Target" as const },
        ].map(({ label, key }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--text-primary)", fontFamily: "'Courier New', monospace" }}>{label}</span>
            <select
              value={local[key]}
              onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
              style={{
                background: "var(--surface-highest)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--primary)",
                fontSize: 12,
                fontFamily: "'Courier New', monospace",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              {TARGET_OPTIONS.map((o) => (
                <option key={o} value={o}>{o.toUpperCase()}</option>
              ))}
            </select>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <input
            type="checkbox"
            id="autoAdjust"
            checked={local.autoAdjust}
            onChange={(e) => setLocal((p) => ({ ...p, autoAdjust: e.target.checked }))}
          />
          <label htmlFor="autoAdjust" style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "'Courier New', monospace", cursor: "pointer" }}>
            Auto-adjust targets based on performance
          </label>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => onSave(local)}
            className="n-btn-primary"
            style={{ flex: 1, padding: "8px 0" }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="n-btn-secondary"
            style={{ flex: 1, padding: "8px 0" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Group items by contest ────────────────────────────────────────
function groupByContest(items: UpsolveItem[]) {
  const map = new Map<string, { participation: ContestParticipation; items: UpsolveItem[] }>()
  for (const item of items) {
    const key = item.contestParticipation.id
    if (!map.has(key)) map.set(key, { participation: item.contestParticipation, items: [] })
    map.get(key)!.items.push(item)
  }
  return Array.from(map.values())
}

// ── Contest Group ────────────────────────────────────────────────
function ContestGroup({ participation, items, highlight }: {
  participation: ContestParticipation
  items: UpsolveItem[]
  highlight?: string
}) {
  const date = new Date(participation.participatedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  })

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "Arial" }}>
          {participation.contestName}
        </div>
        {participation.ratingChange !== null && (
          <span style={{
            fontSize: 11,
            fontFamily: "'Courier New', monospace",
            color: (participation.ratingChange || 0) >= 0 ? "var(--success)" : "var(--danger)",
            background: (participation.ratingChange || 0) >= 0 ? "var(--success-light)" : "var(--danger-light)",
            border: `1px solid ${(participation.ratingChange || 0) >= 0 ? "var(--success)" : "var(--danger)"}`,
            padding: "2px 8px",
            borderRadius: 4,
          }}>
            {(participation.ratingChange || 0) >= 0 ? "+" : ""}{participation.ratingChange}
          </span>
        )}
        {participation.division && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Courier New', monospace" }}>
            Div {participation.division}
          </span>
        )}
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'Courier New', monospace", marginLeft: "auto" }}>{date}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <UpsolveItemRow
            key={item.id}
            item={item}
            showContest={false}
            highlight={highlight === item.problem.id}
            onSkip={async (id) => {
              await fetch(`/api/upsolve/${id}/skip`, { method: "PATCH" })
              window.location.reload()
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Tab ──────────────────────────────────────────────────────────
type Tab = "active" | "stretch" | "graveyard"

// ── Main Page ────────────────────────────────────────────────────
function UpsolveContent() {
  const searchParams = useSearchParams()
  const highlight = searchParams.get("highlight") ?? undefined

  const [tab, setTab] = useState<Tab>("active")
  const [activeItems, setActiveItems] = useState<UpsolveItem[]>([])
  const [stretchItems, setStretchItems] = useState<UpsolveItem[]>([])
  const [graveyardItems, setGraveyardItems] = useState<UpsolveItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [activeRes, stretchRes, graveyardRes, settingsRes] = await Promise.all([
      fetch("/api/upsolve?status=pending&category=target"),
      fetch("/api/upsolve?status=pending&category=stretch"),
      fetch("/api/upsolve/graveyard"),
      fetch("/api/contest-settings"),
    ])
    const [activeData, stretchData, graveyardData, settingsData] = await Promise.all([
      activeRes.json(),
      stretchRes.json(),
      graveyardRes.json(),
      settingsRes.json(),
    ])
    setActiveItems(activeData.items || [])
    setStretchItems(stretchData.items || [])
    setGraveyardItems(graveyardData.items || [])
    setSettings(settingsData.settings || null)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveSettings = async (newSettings: Settings) => {
    await fetch("/api/contest-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSettings),
    })
    setSettings(newSettings)
    setShowSettings(false)
  }

  const tabStyle = (t: Tab) => ({
    padding: "8px 20px",
    fontSize: 13,
    fontFamily: "'Courier New', monospace",
    fontWeight: tab === t ? 700 : 400,
    color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
    background: tab === t ? "var(--surface-high)" : "transparent",
    border: tab === t ? "1px solid var(--border)" : "1px solid transparent",
    borderRadius: 6,
    cursor: "pointer",
  })

  const items = tab === "active" ? activeItems : tab === "stretch" ? stretchItems : graveyardItems
  const groups = groupByContest(items)

  return (
    <div>
      {showSettings && settings && (
        <SettingsPopover
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", fontFamily: "Arial" }}>
            ⏰ Upsolve Queue
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "'Courier New', monospace", marginTop: 4 }}>
            Problems you didn't solve during rated contests — time-limited bonus XP.
          </p>
        </div>
      </div>

      {settings && (
        <TargetBadge settings={settings} onEdit={() => setShowSettings(true)} />
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        <button style={tabStyle("active")} onClick={() => setTab("active")}>
          Active Queue ({activeItems.length})
        </button>
        <button style={tabStyle("stretch")} onClick={() => setTab("stretch")}>
          Stretch Goals ({stretchItems.length})
        </button>
        <button style={tabStyle("graveyard")} onClick={() => setTab("graveyard")}>
          Graveyard ({graveyardItems.length})
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", fontFamily: "'Courier New', monospace", textAlign: "center", padding: "40px 0" }}>
          Loading...
        </div>
      ) : groups.length === 0 ? (
        <div
          className="n-card"
          style={{
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>
            {tab === "active" ? "🏆" : tab === "stretch" ? "🎯" : "💀"}
          </div>
          <div style={{ fontSize: 15, color: "var(--text-primary)", fontFamily: "Arial", fontWeight: 600, marginBottom: 8 }}>
            {tab === "active"
              ? "Queue is empty"
              : tab === "stretch"
              ? "No stretch goals"
              : "Graveyard is empty"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "'Courier New', monospace" }}>
            {tab === "active"
              ? "Participate in a rated contest to fill your upsolve queue."
              : tab === "stretch"
              ? "Problems above your target will appear here."
              : "Expired upsolve items will appear here after 14 days."}
          </div>
        </div>
      ) : (
        <div>
          {tab === "graveyard" && (
            <div
              style={{
                padding: "10px 16px",
                background: "var(--surface-high)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "'Courier New', monospace",
              }}
            >
              💀 These problems expired after 14 days without being solved. They're still solvable — 0.5× XP applies.
            </div>
          )}
          {tab === "stretch" && (
            <div
              style={{
                padding: "10px 16px",
                background: "var(--surface-high)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "'Courier New', monospace",
              }}
            >
              🎯 These are above your current target — no timer or reminders. Solve them to push your target up.
            </div>
          )}
          {groups.map(({ participation, items: groupItems }) => (
            <ContestGroup
              key={participation.id}
              participation={participation}
              items={groupItems}
              highlight={highlight}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function UpsolvePage() {
  return (
    <DashboardLayout>
      <UpsolveContent />
    </DashboardLayout>
  )
}
