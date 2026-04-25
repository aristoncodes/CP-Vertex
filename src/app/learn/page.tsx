"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface IntelTopic {
  slug: string;
  title: string;
  category: string;
  subcategory: string;
  difficulty: number;
  tags: string[];
  problemCount: number;
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
        background: "#f7fafe",
        color: "#181c1f",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* ─── Header ─── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(194,198,214,0.25)",
        }}>
          <div style={{
            maxWidth: 1100, margin: "0 auto", padding: "14px 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <Link href="/learn" style={{
              display: "flex", alignItems: "center", gap: 10,
              textDecoration: "none", color: "#181c1f",
            }}>
              <span className="material-symbols-outlined" style={{ color: "#0366D6", fontSize: 26 }}>menu_book</span>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em" }}>Intel Database</span>
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 20, color: "#727785",
                }}>search</span>
                <input
                  type="text"
                  placeholder="Search algorithms..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setExpandedCategory(null); }}
                  style={{
                    paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
                    background: "#f1f4f8", border: "1px solid rgba(194,198,214,0.3)",
                    borderRadius: 10, fontSize: 14, color: "#181c1f", outline: "none",
                    width: 220, fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>
              <Link href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: "#0366d6", textDecoration: "none", whiteSpace: "nowrap" }}>
                ← CP Vertex
              </Link>
            </div>
          </div>
        </header>

        {/* ─── Main ─── */}
        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", padding: "48px 32px 80px", width: "100%" }}>

          {/* Hero */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, color: "#181c1f", margin: 0 }}>
              Algorithmic Intel Database
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#424753", marginTop: 14, maxWidth: 600 }}>
              Comprehensive references for competitive programming — algorithms, data structures, and mathematical theory.
            </p>
            {!loading && (
              <div style={{ display: "flex", gap: 20, marginTop: 20, fontSize: 13, fontWeight: 600, color: "#727785" }}>
                <span><strong style={{ color: "#0366d6" }}>{topics.length}</strong> articles</span>
                <span><strong style={{ color: "#0366d6" }}>{categories.length}</strong> categories</span>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "96px 0", color: "#0366d6", fontSize: 15, fontWeight: 500 }}>
              Loading Knowledge Base…
            </div>
          )}

          {/* ─── Category Cards Grid ─── */}
          {!loading && !expandedCategory && (
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
                      background: "#ffffff",
                      borderRadius: 16,
                      padding: "28px 24px",
                      border: "1px solid rgba(194,198,214,0.3)",
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
                      e.currentTarget.style.borderColor = "rgba(194,198,214,0.3)";
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
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#181c1f", letterSpacing: "-0.02em" }}>
                          {category}
                        </div>
                        <div style={{ fontSize: 12, color: "#727785", fontWeight: 600, marginTop: 2 }}>
                          {count} article{count !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <p style={{
                      fontSize: 14, lineHeight: 1.55, color: "#5a6577", margin: 0, flex: 1,
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
                  fontSize: 14, fontWeight: 600, color: "#0366d6",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Inter', sans-serif", padding: 0, marginBottom: 32,
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
                  <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "#181c1f" }}>
                    {expandedCategory}
                  </h2>
                  <p style={{ fontSize: 14, color: "#727785", margin: "4px 0 0 0", fontWeight: 500 }}>
                    {Object.values(grouped[expandedCategory]).flat().length} articles
                  </p>
                </div>
              </div>

              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5a6577", marginBottom: 36, maxWidth: 600 }}>
                {(CATEGORY_META[expandedCategory] || DEFAULT_META).summary}
              </p>

              {/* Subcategory sections */}
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {Object.keys(grouped[expandedCategory]).sort().map((sub) => (
                  <div key={sub} style={{
                    background: "#ffffff", borderRadius: 14,
                    border: "1px solid rgba(194,198,214,0.3)",
                    padding: "24px 28px",
                  }}>
                    <h3 style={{
                      fontSize: 12, fontWeight: 700, color: "#727785",
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      margin: "0 0 16px 0",
                    }}>
                      {sub}
                    </h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {grouped[expandedCategory][sub].map((topic) => (
                        <Link
                          key={topic.slug}
                          href={`/learn/${topic.slug}`}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 14px", margin: "0 -14px", borderRadius: 10,
                            textDecoration: "none", color: "#424753", fontSize: 15, fontWeight: 450,
                            transition: "background 0.15s, color 0.15s", lineHeight: 1.4,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f1f4f8";
                            e.currentTarget.style.color = "#004fa8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#424753";
                          }}
                        >
                          <span>{topic.title.replace(/\$/g, "")}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
                            {topic.problemCount > 0 && (
                              <span style={{
                                fontSize: 11, fontWeight: 700, color: "#0366d6",
                                background: "rgba(3,102,214,0.08)", padding: "2px 8px",
                                borderRadius: 6,
                              }}>
                                {topic.problemCount} practice
                              </span>
                            )}
                            <span style={{
                              fontSize: 12, fontWeight: 700,
                              color: topic.difficulty >= 2400 ? "#dc2626"
                                : topic.difficulty >= 1900 ? "#7c3aed"
                                : topic.difficulty >= 1600 ? "#0891b2"
                                : "#059669",
                              minWidth: 28, textAlign: "right",
                            }}>
                              {topic.difficulty}
                            </span>
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
            <div style={{ textAlign: "center", padding: "96px 0", color: "#727785", fontSize: 15, fontWeight: 500 }}>
              No articles found matching &ldquo;{search}&rdquo;
            </div>
          )}
        </main>

        {/* ─── Footer ─── */}
        <footer style={{
          background: "#f1f4f8", borderTop: "1px solid rgba(194,198,214,0.25)", padding: "36px 32px",
        }}>
          <div style={{
            maxWidth: 1100, margin: "0 auto",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#181c1f", marginBottom: 4 }}>Intel Database</div>
              <div style={{ fontSize: 12, color: "#727785" }}>© 2026 CP Vertex · The Curated Scholar</div>
            </div>
            <Link href="/" style={{ fontSize: 13, fontWeight: 600, color: "#0366d6", textDecoration: "none" }}>
              Back to CP Vertex →
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
