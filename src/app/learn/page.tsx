"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getRatingColor, getRatingTierName } from "@/lib/colors";

interface IntelTopic {
  slug: string;
  title: string;
  category: string;
  subcategory: string;
  difficulty: number;
  tags: string[];
  problemCount: number;
}

type SortMode = "default" | "diff-asc" | "diff-desc" | "az";

// Difficulty is a Codeforces-style rating, so label + color both come from the
// canonical CF tier palette — the rank name always matches its color.
function DifficultyBadge({ difficulty, showLabel = true }: { difficulty: number; showLabel?: boolean }) {
  const color = getRatingColor(difficulty);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {showLabel && <span style={{ color }}>{getRatingTierName(difficulty)}</span>}
      <span style={{ color: "var(--text-muted)" }}>{difficulty}</span>
    </span>
  );
}

function sortTopics(topics: IntelTopic[], mode: SortMode): IntelTopic[] {
  if (mode === "default") return topics;
  const t = [...topics];
  if (mode === "az") return t.sort((a, b) => a.title.localeCompare(b.title));
  return t.sort((a, b) => (mode === "diff-asc" ? a.difficulty - b.difficulty : b.difficulty - a.difficulty));
}

const CATEGORY_META: Record<string, { icon: string; summary: string; color: string }> = {
  "Algebra": {
    icon: "calculate",
    summary: "Modular arithmetic, FFT, matrix exponentiation, number systems, and core algebraic methods used across competitive programming.",
    color: "#4f46e5",
  },
  "Data Structures": {
    icon: "account_tree",
    summary: "Segment trees, Fenwick trees, DSU, sparse tables, and advanced structures for efficient query processing.",
    color: "#0891b2",
  },
  "Dynamic Programming": {
    icon: "memory",
    summary: "Classic DP techniques, bitmask DP, broken profile, optimization tricks, and problem-solving paradigms.",
    color: "#d97706",
  },
  "Graphs": {
    icon: "hub",
    summary: "BFS, DFS, shortest paths, flows, matching, strongly connected components, and graph theory fundamentals.",
    color: "#059669",
  },
  "Combinatorics": {
    icon: "functions",
    summary: "Counting principles, Burnside's lemma, Catalan numbers, inclusion-exclusion, and generating functions.",
    color: "#dc2626",
  },
  "Geometry": {
    icon: "architecture",
    summary: "Convex hulls, line intersection, polygon algorithms, and computational geometry primitives.",
    color: "#7c3aed",
  },
  "String Processing": {
    icon: "spellcheck",
    summary: "KMP, Z-function, suffix arrays, Aho-Corasick, hashing, and pattern matching algorithms.",
    color: "#0d9488",
  },
  "Linear Algebra": {
    icon: "grid_on",
    summary: "Gauss elimination, matrix operations, determinants, and linear system solving techniques.",
    color: "#6366f1",
  },
  "Number Theory": {
    icon: "tag",
    summary: "Primes, divisors, Euler's totient, Möbius function, and multiplicative function theory.",
    color: "#ca8a04",
  },
  "Miscellaneous": {
    icon: "widgets",
    summary: "Ternary search, game theory, scheduling, and topics that don't fit neatly into other categories.",
    color: "#64748b",
  },
  "Schedules": {
    icon: "event",
    summary: "Job scheduling, task ordering, and optimization of sequential and parallel processes.",
    color: "#ea580c",
  },
};

const DEFAULT_META = { icon: "menu_book", summary: "Explore articles in this topic area.", color: "#0366d6" };

export default function LearnPage() {
  const [search, setSearch] = useState("");
  const [topics, setTopics] = useState<IntelTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");

  useEffect(() => {
    fetch("/api/intel")
      .then((res) => res.json())
      .then((data) => {
        setTopics(data);
        setLoading(false);
      });
  }, []);

  const filtered = topics.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.subcategory.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  // Group by category → subcategory
  const grouped: Record<string, Record<string, IntelTopic[]>> = {};
  filtered.forEach((topic) => {
    if (!grouped[topic.category]) grouped[topic.category] = {};
    if (!grouped[topic.category][topic.subcategory])
      grouped[topic.category][topic.subcategory] = [];
    grouped[topic.category][topic.subcategory].push(topic);
  });

  const categories = Object.keys(grouped).sort();

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <div style={{
        fontFamily: "'Inter', sans-serif",
        background: "var(--surface)",
        color: "var(--text-primary)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* ─── Header ─── */}
        <header className="n-glass" style={{
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{
            maxWidth: 1100, margin: "0 auto", padding: "14px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <Link href="/learn" style={{
              display: "flex", alignItems: "center", gap: 10,
              textDecoration: "none", color: "var(--text-primary)",
            }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 26 }}>menu_book</span>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.03em" }}>Library</span>
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 20, color: "var(--text-muted)",
                }}>search</span>
                <input
                  type="text"
                  placeholder="Search algorithms..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setExpandedCategory(null); }}
                  style={{
                    paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                    background: "var(--surface-high)", border: "1px solid var(--border)",
                    borderRadius: 10, fontSize: 14, color: "var(--text-primary)", outline: "none",
                    width: 220, fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none", whiteSpace: "nowrap" }}>
                ← CP Vertex
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Main ─── */}
        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 32px 80px", width: "100%" }}>

          {/* Hero */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1.1, color: "var(--text-primary)", margin: 0 }}>
              Algorithmic Library
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--text-secondary)", marginTop: 14, maxWidth: 600 }}>
              Comprehensive references for competitive programming — algorithms, data structures, and mathematical theory.
            </p>
            {!loading && (
              <div style={{ display: "flex", gap: 20, marginTop: 20, fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
                <span><strong style={{ color: "var(--primary)" }}>{topics.length}</strong> articles</span>
                <span><strong style={{ color: "var(--primary)" }}>{categories.length}</strong> categories</span>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "96px 0", color: "var(--primary)", fontSize: 15, fontWeight: 500 }}>
              Loading Knowledge Base…
            </div>
          )}

          {/* ─── Search Results (flat list of matching articles) ─── */}
          {!loading && search && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 20 }}>
                {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
              </div>
              <div style={{
                background: "var(--surface-card)", borderRadius: 14,
                border: "1px solid var(--border)", overflow: "hidden",
              }}>
                {sortTopics(filtered, "diff-asc").map((topic, i) => (
                  <Link
                    key={topic.slug}
                    href={`/learn/${topic.slug}`}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 20px", textDecoration: "none",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-high)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.35 }}>
                        {topic.title.replace(/\$/g, "")}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginTop: 3 }}>
                        {topic.category} · {topic.subcategory}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0, marginLeft: 16 }}>
                      {topic.problemCount > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: "var(--primary)",
                          background: "rgba(3,102,214,0.08)", padding: "2px 8px", borderRadius: 6,
                        }}>
                          {topic.problemCount} practice
                        </span>
                      )}
                      <DifficultyBadge difficulty={topic.difficulty} />
                      <span className="material-symbols-outlined" style={{ fontSize: 16, opacity: 0.3 }}>chevron_right</span>
                    </div>
                  </Link>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    No articles match your search.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Category Cards Grid ─── */}
          {!loading && !expandedCategory && !search && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}>
              {categories.map((category) => {
                const meta = CATEGORY_META[category] || DEFAULT_META;
                const count = Object.values(grouped[category]).flat().length;

                return (
                  <button
                    key={category}
                    onClick={() => setExpandedCategory(category)}
                    style={{
                      background: "var(--surface-card)",
                      borderRadius: 16,
                      padding: "28px 24px",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Inter', sans-serif",
                      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      minHeight: 200,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = meta.color + "50";
                      e.currentTarget.style.boxShadow = `0 8px 24px ${meta.color}12`;
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Icon + Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: meta.color + "12",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <span className="material-symbols-outlined" style={{
                          fontSize: 24, color: meta.color,
                          fontVariationSettings: "'FILL' 1",
                        }}>{meta.icon}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                          {category}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>
                          {count} article{count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <p style={{
                      fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)", margin: 0, flex: 1,
                    }}>
                      {meta.summary}
                    </p>

                    {/* Footer hint */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 13, fontWeight: 600, color: meta.color,
                      marginTop: "auto",
                    }}>
                      Explore topics
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── Expanded Category View ─── */}
          {!loading && expandedCategory && grouped[expandedCategory] && (
            <div>
              {/* Back button */}
              <button
                onClick={() => setExpandedCategory(null)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 14, fontWeight: 600, color: "var(--primary)",
                  background: "var(--surface-card)", border: "1px solid var(--border)", borderRadius: 12, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", padding: "8px 16px", marginBottom: 32,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                Back to all categories
              </button>

              {/* Category Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: (CATEGORY_META[expandedCategory] || DEFAULT_META).color + "12",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: 26, color: (CATEGORY_META[expandedCategory] || DEFAULT_META).color,
                    fontVariationSettings: "'FILL' 1",
                  }}>{(CATEGORY_META[expandedCategory] || DEFAULT_META).icon}</span>
                </div>
                <div>
                  <h2 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", margin: 0, color: "var(--text-primary)" }}>
                    {expandedCategory}
                  </h2>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "4px 0 0 0", fontWeight: 500 }}>
                    {Object.values(grouped[expandedCategory]).flat().length} articles
                  </p>
                </div>
              </div>

              <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 24, maxWidth: 600 }}>
                {(CATEGORY_META[expandedCategory] || DEFAULT_META).summary}
              </p>

              {/* Sort control */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginRight: 2 }}>Sort</span>
                {([
                  ["default", "Curated"],
                  ["diff-asc", "Difficulty ↑"],
                  ["diff-desc", "Difficulty ↓"],
                  ["az", "A–Z"],
                ] as [SortMode, string][]).map(([mode, label]) => {
                  const active = sortMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                        background: active ? "var(--primary-light)" : "var(--surface-card)",
                        color: active ? "var(--primary)" : "var(--text-secondary)",
                        transition: "border-color 0.15s, color 0.15s, background 0.15s",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Subcategory sections */}
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {Object.keys(grouped[expandedCategory]).sort().map((sub) => (
                  <div key={sub} style={{
                    background: "var(--surface-card)", borderRadius: 14,
                    border: "1px solid var(--border)",
                    padding: "24px 28px",
                  }}>
                    <h3 style={{
                      fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      margin: "0 0 16px 0",
                    }}>
                      {sub}
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {sortTopics(grouped[expandedCategory][sub], sortMode).map((topic) => (
                        <Link
                          key={topic.slug}
                          href={`/learn/${topic.slug}`}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 14px", margin: "0 -14px", borderRadius: 10,
                            textDecoration: "none", color: "var(--text-secondary)", fontSize: 15, fontWeight: 450,
                            transition: "background 0.15s, color 0.15s", lineHeight: 1.4,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--surface-high)";
                            e.currentTarget.style.color = "var(--primary)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }}
                        >
                          <span>{topic.title.replace(/\$/g, "")}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                            {topic.problemCount > 0 && (
                              <span style={{
                                fontSize: 11, fontWeight: 700, color: "var(--primary)",
                                background: "rgba(3,102,214,0.08)", padding: "2px 8px",
                                borderRadius: 6,
                              }}>
                                {topic.problemCount} practice
                              </span>
                            )}
                            <DifficultyBadge difficulty={topic.difficulty} />
                            <span className="material-symbols-outlined" style={{ fontSize: 16, opacity: 0.3 }}>chevron_right</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && categories.length === 0 && (
            <div style={{ textAlign: "center", padding: "96px 0", color: "var(--text-muted)", fontSize: 15, fontWeight: 500 }}>
              No articles found matching &ldquo;{search}&rdquo;
            </div>
          )}
        </main>

        {/* ─── Footer ─── */}
        <footer style={{
          background: "var(--surface-low)", borderTop: "1px solid var(--border)", padding: "36px 32px",
        }}>
          <div style={{
            maxWidth: 1100, margin: "0 auto",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Library</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>© 2026 CP Vertex · The Curated Scholar</div>
            </div>
            <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: "var(--primary)", textDecoration: "none" }}>
              Back to CP Vertex →
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
