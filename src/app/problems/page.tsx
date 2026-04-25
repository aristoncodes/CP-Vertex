"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

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

function ratingColor(r: number) {
  if (r >= 2400) return "var(--danger)";
  if (r >= 2100) return "#7c3aed";
  if (r >= 1900) return "var(--info)";
  if (r >= 1600) return "var(--success)";
  if (r >= 1200) return "var(--warning)";
  return "var(--text-muted)";
}

function ProblemsMain() {
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
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Problems</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>{total.toLocaleString()} problems in database</p>
        </div>
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

export default function ProblemsPage() {
  return (
    <DashboardLayout>
      <ProblemsMain />
    </DashboardLayout>
  );
}
