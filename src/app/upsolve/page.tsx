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
          className="n-badge"
          style={{
            background: "var(--surface-low)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
            padding: "4px 12px",
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>{label}: </span>
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>{value.toUpperCase()}</span>
        </span>
      ))}
      <button
        onClick={onEdit}
        className="n-btn-secondary"
        style={{
          padding: "4px 12px",
          fontSize: 12,
          gap: 4,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
        Edit Targets
      </button>
      {settings.autoAdjust && (
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
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
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
          Division Targets
        </div>
        {[
          { label: "Div 1", key: "div1Target" as const },
          { label: "Div 2", key: "div2Target" as const },
          { label: "Div 3", key: "div3Target" as const },
          { label: "Div 4", key: "div4Target" as const },
        ].map(({ label, key }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{label}</span>
            <select
              value={local[key]}
              onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
              className="n-input"
              style={{
                width: "auto",
                padding: "4px 8px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--primary)",
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
          <label htmlFor="autoAdjust" style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
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
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          {participation.contestName}
        </div>
        {participation.ratingChange !== null && (
          <span className="n-badge" style={{
            background: (participation.ratingChange || 0) >= 0 ? "var(--success-light)" : "var(--danger-light)",
            color: (participation.ratingChange || 0) >= 0 ? "var(--success)" : "var(--danger)",
            fontSize: 11,
            fontWeight: 700,
          }}>
            {(participation.ratingChange || 0) >= 0 ? "+" : ""}{participation.ratingChange}
          </span>
        )}
        {participation.division && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
            Div {participation.division}
          </span>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginLeft: "auto" }}>{date}</span>
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
    fontSize: 12,
    padding: "5px 14px",
    cursor: "pointer" as const,
    borderRadius: 8,
    fontWeight: 600,
    border: `1px solid ${tab === t ? "var(--primary)" : "var(--border)"}`,
    background: tab === t ? "var(--primary-light)" : "var(--surface-card)",
    color: tab === t ? "var(--primary)" : "var(--text-muted)",
    fontFamily: "'Inter', sans-serif",
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
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Upsolve Queue
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
            Problems you didn&apos;t solve during rated contests — time-limited bonus XP.
          </p>
        </div>
      </div>

      {settings && (
        <TargetBadge settings={settings} onEdit={() => setShowSettings(true)} />
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
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
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="n-skeleton" style={{ width: 200, height: 16, margin: "0 auto 12px" }} />
          <div className="n-skeleton" style={{ width: 140, height: 12, margin: "0 auto" }} />
        </div>
      ) : groups.length === 0 ? (
        <div
          className="n-card"
          style={{
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 36,
              color: tab === "active" ? "var(--warning)" : tab === "stretch" ? "var(--info)" : "var(--text-muted)",
              fontVariationSettings: "'FILL' 1",
            }}>
              {tab === "active" ? "emoji_events" : tab === "stretch" ? "target" : "skull"}
            </span>
          </div>
          <div style={{ fontSize: 15, color: "var(--text-primary)", fontWeight: 600, marginBottom: 8 }}>
            {tab === "active"
              ? "Queue is empty"
              : tab === "stretch"
              ? "No stretch goals"
              : "Graveyard is empty"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
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
              className="n-card"
              style={{
                padding: "10px 16px",
                marginBottom: 20,
                fontSize: 12,
                color: "var(--text-secondary)",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--text-muted)" }}>skull</span>
              These problems expired after 14 days without being solved. They&apos;re still solvable — 0.5× XP applies.
            </div>
          )}
          {tab === "stretch" && (
            <div
              className="n-card"
              style={{
                padding: "10px 16px",
                marginBottom: 20,
                fontSize: 12,
                color: "var(--text-secondary)",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--info)" }}>target</span>
              These are above your current target — no timer or reminders. Solve them to push your target up.
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
