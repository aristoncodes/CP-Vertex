"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useRef, useEffect } from "react";

const CF_TAGS = [
  "2-sat", "binary search", "bitmasks", "brute force", "chinese theorem",
  "combinatorics", "constructive algorithms", "data structures", "dfs and similar",
  "divide and conquer", "dp", "dsu", "expression parsing", "fft", "flows", "games",
  "geometry", "graph matchings", "graphs", "greedy", "hashing", "implementation",
  "interactive", "math", "matrices", "meet-in-the-middle", "number theory",
  "probabilities", "schedules", "shortest paths", "sortings", "string suffix structures",
  "strings", "ternary search", "trees", "two pointers"
];

interface Problem {
  contestId: number;
  index: string;
  code: string;
  name: string;
  rating: number;
  tags: string[];
}

function getRatingColor(rating: number) {
  if (rating < 1200) return "var(--text-muted)";
  if (rating < 1400) return "var(--success)";
  if (rating < 1600) return "var(--info)";
  if (rating < 1900) return "var(--primary)";
  if (rating < 2100) return "#a78bfa";
  if (rating < 2400) return "var(--warning)";
  return "var(--danger)";
}

function getRatingBg(rating: number) {
  if (rating < 1200) return "var(--surface-high)";
  if (rating < 1400) return "var(--success-light)";
  if (rating < 1600) return "var(--info-light)";
  if (rating < 1900) return "var(--primary-light)";
  if (rating < 2100) return "rgba(167, 139, 250, 0.10)";
  if (rating < 2400) return "var(--warning-light)";
  return "var(--danger-light)";
}

export default function GymFinderPage() {
  const [handles, setHandles] = useState("");
  const [minRating, setMinRating] = useState(800);
  const [maxRating, setMaxRating] = useState(3500);
  const [maxProblems, setMaxProblems] = useState(50);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);

  const [loadingState, setLoadingState] = useState<"idle" | "validating" | "fetching" | "filtering" | "done">("idle");
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState("");
  const [results, setResults] = useState<Problem[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const [page, setPage] = useState(1);
  const itemsPerPage = 25;
  const eventSourceRef = useRef<EventSource | null>(null);

  const filteredTags = CF_TAGS.filter(t => t.includes(tagInput.toLowerCase()) && !selectedTags.includes(t));
  const filteredResults = results.filter(p =>
    p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.code.toLowerCase().includes(searchFilter.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const currentResults = filteredResults.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Close tag dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setShowTagDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, []);

  const startSearch = () => {
    setError("");
    setResults([]);
    setPage(1);

    const handleList = handles.split(/[\s,]+/).filter(Boolean);
    if (handleList.length === 0) {
      setError("Please enter at least one Codeforces handle.");
      return;
    }

    if (eventSourceRef.current) eventSourceRef.current.close();
    setLoadingState("validating");

    const params = new URLSearchParams({
      handles: handleList.join(","),
      minRating: minRating.toString(),
      maxRating: maxRating.toString(),
      maxProblems: maxProblems.toString(),
    });
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));

    const eventSource = new EventSource(`/api/contests/gym-finder?${params.toString()}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.stage) {
        case "validating": setLoadingState("validating"); break;
        case "fetching":
          setLoadingState("fetching");
          setFetchProgress({ current: data.current, total: data.total });
          break;
        case "filtering": setLoadingState("filtering"); break;
        case "done":
          setLoadingState("done");
          setResults(data.data);
          eventSource.close();
          setTimeout(() => setLoadingState("idle"), 500);
          break;
        case "error":
          setError(data.message);
          setLoadingState("idle");
          eventSource.close();
          break;
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost. Codeforces API may be temporarily unavailable.");
      setLoadingState("idle");
      eventSource.close();
    };
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const isLoading = loadingState !== "idle";
  const progressPct = loadingState === "validating" ? 15
    : loadingState === "fetching" ? 20 + (fetchProgress.total > 0 ? (fetchProgress.current / fetchProgress.total) * 60 : 0)
    : loadingState === "filtering" ? 90
    : loadingState === "done" ? 100 : 0;

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            ⚡ Gym Problem Finder
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>
            Find fresh Codeforces problems that none of your team has solved
          </p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="n-card" style={{ padding: 24 }}>
        {/* Rating Range */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>tune</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Target Rating Range</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", background: "var(--primary-light)", borderRadius: "var(--radius-full)", fontWeight: 700, fontSize: 14, color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
              {minRating}
            </div>
            <input type="range" min={800} max={3500} step={100} value={minRating} onChange={e => setMinRating(Math.min(Number(e.target.value), maxRating))}
              style={{ flex: 1, accentColor: "var(--primary)" }} />
            <span style={{ color: "var(--text-faint)", fontSize: 13, fontWeight: 500 }}>to</span>
            <input type="range" min={800} max={3500} step={100} value={maxRating} onChange={e => setMaxRating(Math.max(Number(e.target.value), minRating))}
              style={{ flex: 1, accentColor: "var(--primary)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", background: "var(--primary-light)", borderRadius: "var(--radius-full)", fontWeight: 700, fontSize: 14, color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
              {maxRating}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#a78bfa", fontVariationSettings: "'FILL' 1" }}>label</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Topics & Tags</span>
            <span style={{ fontSize: 12, color: "var(--text-faint)", marginLeft: 4 }}>(OR logic)</span>
          </div>
          <div ref={tagRef} style={{ position: "relative" }}>
            <div
              onClick={() => { setShowTagDropdown(true); }}
              style={{
                display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
                padding: "8px 12px", minHeight: 46,
                background: "var(--surface-low)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", cursor: "text",
                transition: "border-color 0.2s",
              }}
            >
              {selectedTags.map(tag => (
                <span key={tag} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "3px 10px 3px 12px", background: "var(--primary-light)",
                  border: "1px solid var(--border-hover)", borderRadius: "var(--radius-full)",
                  fontSize: 13, fontWeight: 600, color: "var(--primary)",
                }}>
                  {tag}
                  <button onClick={(e) => { e.stopPropagation(); setSelectedTags(selectedTags.filter(t => t !== tag)); }}
                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 14, fontWeight: 700, lineHeight: 1, padding: 0 }}>
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text" value={tagInput}
                onChange={e => { setTagInput(e.target.value); setShowTagDropdown(true); }}
                onFocus={() => setShowTagDropdown(true)}
                placeholder={selectedTags.length === 0 ? "Search and select tags..." : ""}
                style={{ flex: 1, minWidth: 120, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 14 }}
              />
            </div>
            {showTagDropdown && filteredTags.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
                background: "var(--surface-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)",
                maxHeight: 220, overflowY: "auto",
              }}>
                {filteredTags.slice(0, 8).map(tag => (
                  <div key={tag} onClick={() => { setSelectedTags([...selectedTags, tag]); setTagInput(""); }}
                    style={{ padding: "10px 14px", fontSize: 14, color: "var(--text-secondary)", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseOver={e => e.currentTarget.style.background = "var(--primary-light)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Handles + Max Problems row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--info)", fontVariationSettings: "'FILL' 1" }}>group</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Codeforces Handles</span>
            </div>
            <textarea
              value={handles} onChange={e => setHandles(e.target.value)}
              placeholder={"tourist, jiangly\nBenq\necnerwala"}
              className="n-input"
              style={{ resize: "vertical", minHeight: 100, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7 }}
            />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>filter_list</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Max Problems</span>
            </div>
            <input
              type="number" value={maxProblems} onChange={e => setMaxProblems(Number(e.target.value))} min={0}
              className="n-input"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700 }}
            />
            <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>Set to 0 for unlimited results.</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 16px", marginBottom: 20,
            background: "var(--danger-light)", border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: "var(--radius-sm)",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--danger)", marginTop: 1 }}>error</span>
            <span style={{ fontSize: 14, color: "var(--danger)", lineHeight: 1.5 }}>{error}</span>
            <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
        )}

        {/* Search Button */}
        <button onClick={startSearch} disabled={isLoading} className="n-btn-primary" style={{ width: "100%", padding: "14px 24px", fontSize: 15, opacity: isLoading ? 0.6 : 1 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isLoading ? "hourglass_empty" : "search"}</span>
          {isLoading ? "Processing..." : "Validate Handles & Search"}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="n-card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto 20px", borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--primary)", animation: "spin 1s linear infinite" }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
            {loadingState === "validating" && "Validating handles..."}
            {loadingState === "fetching" && `Fetching submissions (${fetchProgress.current}/${fetchProgress.total})...`}
            {loadingState === "filtering" && "Intersecting data & filtering..."}
            {loadingState === "done" && "✓ Done!"}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Please wait while we process your request</p>
          <div style={{ maxWidth: 400, margin: "16px auto 0" }}>
            <div className="n-progress-track">
              <div className="n-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !isLoading && (
        <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Results header */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>assignment</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Unsolved Problems</span>
              <span className="n-badge" style={{ marginLeft: 4, background: "var(--primary-light)", color: "var(--primary)", fontSize: 12 }}>
                {filteredResults.length} found
              </span>
            </div>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "var(--text-faint)" }}>search</span>
              <input
                type="text" value={searchFilter} onChange={e => { setSearchFilter(e.target.value); setPage(1); }}
                placeholder="Filter results..."
                className="n-input"
                style={{ paddingLeft: 34, width: 240, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Table */}
          <table className="n-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Code</th>
                <th style={{ textAlign: "left" }}>Problem Name</th>
                <th style={{ width: 80, textAlign: "center" }}>Rating</th>
                <th style={{ textAlign: "left" }}>Tags</th>
                <th style={{ width: 90, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentResults.map(p => (
                <tr key={p.code}>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{p.code}</td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    <a href={`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`} target="_blank" rel="noreferrer"
                      style={{ color: "var(--text-primary)", transition: "color 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.color = "var(--primary)"}
                      onMouseOut={e => e.currentTarget.style.color = "var(--text-primary)"}>
                      {p.name}
                    </a>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 700, color: getRatingColor(p.rating), background: getRatingBg(p.rating) }}>
                      {p.rating}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {p.tags.slice(0, 3).map(t => (
                        <span key={t} className="n-tag" style={{ padding: "2px 8px", fontSize: 11 }}>{t}</span>
                      ))}
                      {p.tags.length > 3 && <span style={{ fontSize: 11, color: "var(--text-faint)", padding: "2px 4px" }}>+{p.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                      <button onClick={() => copyCode(p.code)} title="Copy code"
                        style={{
                          width: 32, height: 32, borderRadius: "var(--radius-sm)",
                          background: copiedCode === p.code ? "var(--success-light)" : "transparent",
                          border: "1px solid var(--border)",
                          color: copiedCode === p.code ? "var(--success)" : "var(--text-muted)",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          {copiedCode === p.code ? "check" : "content_copy"}
                        </span>
                      </button>
                      <a href={`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`} target="_blank" rel="noreferrer" title="Open on CF"
                        style={{
                          width: 32, height: 32, borderRadius: "var(--radius-sm)",
                          background: "transparent", border: "1px solid var(--border)",
                          color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {currentResults.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    No problems match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="n-btn-secondary"
                style={{ padding: "6px 16px", fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}>
                ← Previous
              </button>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                Page <strong style={{ color: "var(--text-primary)" }}>{page}</strong> of {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="n-btn-secondary"
                style={{ padding: "6px 16px", fontSize: 13, opacity: page === totalPages ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
