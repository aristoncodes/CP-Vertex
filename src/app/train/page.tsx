"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useEffect, useState, useCallback, Suspense } from "react";
import { getRatingColor as ratingColor } from "@/lib/colors";

/* ─────────────── Training Modes (from old Practice page) ─────────────── */

const modes = [
  {
    name: "Boss Fight",
    desc: "Face a problem 300-500 above your rating. One target. Maximum XP. Pure challenge.",
    color: "var(--danger)",
    xp: "200-500 XP",
    difficulty: "Extreme",
    icon: "local_fire_department",
    route: "/arena/boss",
  },
  {
    name: "Blitz Mode",
    desc: "3-5 comfort-zone problems. Speed run. Build confidence and stack XP fast.",
    color: "var(--warning)",
    xp: "50-100 XP",
    difficulty: "Normal",
    icon: "bolt",
    route: "/train/session?mode=blitz",
  },
  {
    name: "Drill",
    desc: "5-8 problems targeting your weakest tags. Systematic improvement.",
    color: "var(--success)",
    xp: "100-250 XP",
    difficulty: "Hard",
    icon: "target",
    route: "/train/session?mode=drill",
  },
  {
    name: "Warmup",
    desc: "2-3 quick problems at your rating level. A 10-minute warm-up before the real grind.",
    color: "var(--info)",
    xp: "30-60 XP",
    difficulty: "Easy",
    icon: "speed",
    route: "/train/session?mode=warmup",
  },
];

/* ─────────────── Problem Browser (from old Problems page) ─────────────── */

interface Problem {
  id: string;
  cfId: string;
  cfLink: string;
  title: string;
  rating: number;
  solvedCount: number;
  tags: string[];
  status: "solved" | "attempted" | "unsolved";
}

interface PickedProblem {
  id: string;
  cfId: string;
  cfLink: string;
  title: string;
  tags: string[];
  solvedCount: number;
}

function ProblemBrowser() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 9999]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<"rating" | "solvedCount" | "title">("rating");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [tagFilter, setTagFilter] = useState("");

  const [picked, setPicked] = useState<PickedProblem | null>(null);
  const [picking, setPicking] = useState(false);

  const fetchProblems = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "30");
    params.set("sort", sortCol);
    params.set("order", sortDir);
    if (ratingRange[0] > 0 && ratingRange[1] < 9999) {
      params.set("minRating", String(ratingRange[0]));
      params.set("maxRating", String(ratingRange[1]));
    }
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);
    if (tagFilter) params.set("tag", tagFilter);

    fetch(`/api/problems?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.problems) {
          setProblems(data.problems);
          setTotal(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, sortCol, sortDir, ratingRange, statusFilter, search, tagFilter]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);
  useEffect(() => { setPage(1); }, [ratingRange, statusFilter, search, tagFilter]);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/user/sync", { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Sync started! Your submissions are being imported." : "Error: " + (data.error || "Sync failed"));
    } catch { alert("Sync failed."); }
    finally { setImporting(false); }
  };

  const handlePick = async () => {
    setPicking(true); setPicked(null);
    try {
      const res = await fetch("/api/problems/pick");
      const data = await res.json();
      if (res.ok) setPicked(data);
      else alert("Error: " + (data.error || "No problems found"));
    } catch { alert("Could not pick a problem."); }
    finally { setPicking(false); }
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{total.toLocaleString()} problems in database</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="n-btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={handlePick} disabled={picking}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>casino</span>
            {picking ? "Finding..." : "Pick for me"}
          </button>
          <input
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="n-input"
            style={{ width: 220, padding: "8px 14px", fontSize: 13 }}
          />
          <button className="n-btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={handleImport} disabled={importing}>
            {importing ? "Syncing..." : "Sync Submissions"}
          </button>
        </div>
      </div>

      {/* Picked problem */}
      {picked && (
        <div className="n-card" style={{ padding: "20px 24px", borderColor: "var(--success)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--success)", marginBottom: 4 }}>Random Pick</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{picked.title}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {picked.tags.map(t => <span key={t} className="n-tag" style={{ fontSize: 11 }}>{t}</span>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={picked.cfLink} target="_blank" rel="noreferrer" className="n-btn-primary" style={{ padding: "10px 20px", textDecoration: "none" }}>
              Solve ↗
            </a>
            <button className="n-btn-secondary" style={{ padding: "10px 16px", fontSize: 13 }} onClick={handlePick}>Reroll</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center" }}>
        {[[800, 1100], [1200, 1500], [1600, 1900], [2000, 2300], [2400, 3500]].map(([lo, hi]) => {
          const active = ratingRange[0] === lo && ratingRange[1] === hi;
          return (
            <button key={lo} onClick={() => active ? setRatingRange([0, 9999]) : setRatingRange([lo, hi])}
              style={{
                fontSize: 12, padding: "5px 14px", cursor: "pointer", borderRadius: 8, fontWeight: 600,
                border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                background: active ? "var(--primary-light)" : "var(--surface-card)",
                color: active ? "var(--primary)" : "var(--text-muted)",
                fontFamily: "'Inter', sans-serif",
              }}>
              {lo}–{hi}
            </button>
          );
        })}

        <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />

        {["all", "solved", "attempted", "unsolved"].map((s) => {
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                fontSize: 12, padding: "5px 14px", cursor: "pointer", borderRadius: 8, fontWeight: 600,
                border: `1px solid ${active ? "var(--success)" : "var(--border)"}`,
                background: active ? "var(--success-light)" : "var(--surface-card)",
                color: active ? "var(--success)" : "var(--text-muted)",
                textTransform: "capitalize", fontFamily: "'Inter', sans-serif",
              }}>
              {s}
            </button>
          );
        })}

        {tagFilter && (
          <button onClick={() => setTagFilter("")}
            style={{
              fontSize: 12, padding: "5px 14px", cursor: "pointer", borderRadius: 8, fontWeight: 600,
              border: "1px solid var(--warning)", background: "var(--warning-light)",
              color: "var(--warning)", fontFamily: "'Inter', sans-serif",
            }}>
            Tag: {tagFilter} ×
          </button>
        )}
      </div>

      {/* Table */}
      <div className="n-card" style={{ overflow: "hidden", padding: 0 }}>
        <table className="n-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th style={{ width: 70 }}>#</th>
              <th onClick={() => toggleSort("title")} style={{ cursor: "pointer" }}>
                Problem {sortCol === "title" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th onClick={() => toggleSort("rating")} style={{ width: 90, textAlign: "center", cursor: "pointer" }}>
                Rating {sortCol === "rating" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th onClick={() => toggleSort("solvedCount")} style={{ width: 90, textAlign: "center", cursor: "pointer" }}>
                Solved {sortCol === "solvedCount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</td></tr>
            ) : problems.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No problems match your filters.</td></tr>
            ) : (
              problems.map((p) => (
                <tr key={p.id} style={{ borderLeft: p.status === "solved" ? "3px solid var(--success)" : "3px solid transparent" }}>
                  <td style={{ textAlign: "center" }}>
                    {p.status === "solved" && (
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                    {p.status === "attempted" && (
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--warning)" }}>radio_button_unchecked</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{p.cfId}</td>
                  <td>
                    <a href={p.cfLink} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                      {p.title}
                    </a>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="n-badge" style={{ background: `${ratingColor(p.rating)}15`, color: ratingColor(p.rating) }}>{p.rating}</span>
                  </td>
                  <td style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>×{p.solvedCount.toLocaleString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="n-tag" onClick={() => setTagFilter(t)} style={{ cursor: "pointer", fontSize: 11 }}>{t}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "center" }}>
          <button className="n-btn-secondary" style={{ padding: "6px 16px", fontSize: 13 }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            ← Previous
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Page {page} of {totalPages}</span>
          <button className="n-btn-secondary" style={{ padding: "6px 16px", fontSize: 13 }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      )}
    </>
  );
}

/* ─────────────── Upsolve Tracker (embedded) ─────────────── */

function UpsolveTab() {
  const router = useRouter();
  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--text-faint)", display: "block", margin: "0 auto 12px" }}>history</span>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Upsolve Queue</div>
      <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
        Track contest problems you didn&apos;t solve and revisit them.
      </p>
      <button className="n-btn-primary" onClick={() => router.push("/upsolve")} style={{ padding: "10px 24px" }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
        Open Full Tracker
      </button>
    </div>
  );
}

/* ─────────────── Main Train Page ─────────────── */

type Tab = "modes" | "problems" | "upsolve";

function TrainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "modes";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "modes", label: "Training Modes", icon: "fitness_center" },
    { key: "problems", label: "Problem Browser", icon: "code" },
    { key: "upsolve", label: "Upsolve Queue", icon: "history" },
  ];

  return (
    <>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Train</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>All solo practice in one place</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key === "upsolve") {
                router.push("/upsolve");
              } else {
                setActiveTab(tab.key);
              }
            }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 18px", fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "var(--primary)" : "var(--text-muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
              background: "transparent", border: "none", borderRadius: 0,
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "color 0.15s",
              marginBottom: -1,
            }}
          >
            <span className="material-symbols-outlined" style={{
              fontSize: 16,
              fontVariationSettings: activeTab === tab.key ? "'FILL' 1" : "'FILL' 0",
            }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "modes" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {modes.map((mode) => (
              <button
                key={mode.name}
                onClick={() => router.push(mode.route)}
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "28px 24px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "'Inter', sans-serif",
                  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = mode.color;
                  e.currentTarget.style.boxShadow = `0 8px 24px ${mode.color}15`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${mode.color}10`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: mode.color, fontVariationSettings: "'FILL' 1" }}>
                      {mode.icon}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{mode.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: mode.color }}>{mode.xp}</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>{mode.desc}</p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span className="n-badge" style={{ background: `${mode.color}12`, color: mode.color }}>{mode.difficulty}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Virtual Contest */}
          <div className="n-card" style={{ padding: "20px 24px" }}>
            <div className="n-section-label">Contest Simulation</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
                Simulate a real Codeforces Div.2 round with time pressure. 5 problems. 2 hours.
              </p>
              <button className="n-btn-secondary" style={{ padding: "8px 20px", fontSize: 13 }} onClick={() => router.push("/arena/contest")}>
                Start Simulation
              </button>
            </div>
          </div>

        </>
      )}

      {activeTab === "problems" && <ProblemBrowser />}
      {activeTab === "upsolve" && <UpsolveTab />}
    </>
  );
}

export default function TrainPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          Loading...
        </div>
      }>
        <TrainContent />
      </Suspense>
    </DashboardLayout>
  );
}
