"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface SearchResult {
  id: string;
  name: string | null;
  cfHandle: string | null;
  cfRating: number | null;
  level: number;
  xp: number;
  image: string | null;
}

interface DuelRecord {
  id: string;
  status: string;
  winnerId: string | null;
  player1Id: string;
  player1: { id: string; name: string | null; cfHandle: string | null };
  player2: { id: string; name: string | null; cfHandle: string | null };
  problem: { title: string; rating: number } | null;
  startedAt: string;
}

export default function MatchmakingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<DuelRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<SearchResult | null>(null);
  const [questionCount, setQuestionCount] = useState(1);
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(d => { if (d.id) setUserId(d.id); }).catch(() => {});
    fetch("/api/duels?history=true").then(r => r.json()).then(d => { if (d.duels) setHistory(d.duels); setLoadingHistory(false); }).catch(() => setLoadingHistory(false));
  }, []);

  // Auto-search if challenge param is present
  useEffect(() => {
    const challengeId = searchParams.get("challenge");
    const challengeName = searchParams.get("name");
    if (challengeId && challengeName) {
      setQuery(challengeName);
    }
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/user/search?q=${encodeURIComponent(query)}`).then(r => r.json()).then(d => { if (d.users) setResults(d.users); setSearching(false); }).catch(() => setSearching(false));
    }, 400);
  }, [query]);

  const openChallengeModal = (opponent: SearchResult) => {
    setSelectedOpponent(opponent);
    // Pre-fill rating range based on average
    const myRating = 800; // fallback
    const avgRating = Math.round(((opponent.cfRating || 800) + myRating) / 2);
    setMinRating(String(avgRating - 100));
    setMaxRating(String(avgRating + 100));
    setQuestionCount(1);
    setShowModal(true);
  };

  const handleSendChallenge = async () => {
    if (!selectedOpponent) return;
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        opponentId: selectedOpponent.id,
        questionCount,
      };
      if (minRating) payload.minRating = parseInt(minRating);
      if (maxRating) payload.maxRating = parseInt(maxRating);

      const res = await fetch("/api/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Error: " + (data.error || "Failed"));
        return;
      }
      setShowModal(false);
      router.push(`/arena/duel/${data.duel.id}`);
    } catch {
      alert("Matchmaking server offline.");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>1v1 Matchmaking</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>Search by Codeforces handle or name, then configure your duel</p>
      </div>

      {/* Search */}
      <input
        className="n-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Enter CF handle or username..."
        style={{ width: "100%" }}
        autoFocus
      />

      {/* Search Results */}
      {query.length >= 2 && (
        <div className="n-card" style={{ padding: "18px 22px" }}>
          <div className="n-section-label">Results</div>
          {searching ? (
            <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>Searching...</div>
          ) : results.length === 0 ? (
            <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>No users found matching &quot;{query}&quot;</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {results.map(u => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "var(--surface-low)", borderRadius: 12, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: "var(--surface-high)", display: "flex",
                      alignItems: "center", justifyContent: "center", overflow: "hidden",
                    }}>
                      {u.image ? (
                        <img src={u.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--text-muted)" }}>person</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{u.name || u.cfHandle || "Unknown"}</div>
                      <div style={{ display: "flex", gap: 12, marginTop: 3, fontSize: 12, color: "var(--text-muted)" }}>
                        {u.cfHandle && <span>@{u.cfHandle}</span>}
                        <span style={{ color: "var(--info)" }}>Rating {u.cfRating || "?"}</span>
                        <span style={{ color: "var(--warning)" }}>Lvl {u.level}</span>
                      </div>
                    </div>
                  </div>
                  <button className="n-btn-primary" style={{ padding: "8px 20px", fontSize: 13 }} onClick={() => openChallengeModal(u)}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swords</span>
                    Challenge
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Duel History */}
      <div className="n-card" style={{ padding: "18px 22px" }}>
        <div className="n-section-label">Duel History</div>
        {loadingHistory ? (
          <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>No previous duels — challenge your first opponent above</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {history.map(d => {
              const isWinner = d.winnerId === userId;
              const isDraw = d.status === "expired";
              const isDeclined = d.status === "declined";
              const opponent = d.player1.id === userId ? d.player2 : d.player1;
              return (
                <div key={d.id} onClick={() => router.push(`/arena/duel/${d.id}`)} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px",
                  background: "var(--surface-low)", borderRadius: 12, cursor: "pointer",
                  border: `1px solid ${isDeclined ? "var(--border)" : isDraw ? "var(--border)" : isWinner ? "rgba(5,150,105,0.3)" : "rgba(220,38,38,0.3)"}`,
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isDeclined ? "var(--text-muted)" : isDraw ? "var(--text-muted)" : isWinner ? "var(--success)" : "var(--danger)" }}>
                        {isDeclined ? "Declined" : isDraw ? "Draw" : isWinner ? "Victory" : "Defeat"}
                      </span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>vs {opponent.name || opponent.cfHandle || "???"}</span>
                    </div>
                    {d.problem && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{d.problem.title} · Rating {d.problem.rating}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(d.startedAt).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Challenge Configuration Modal ═══ */}
      {showModal && selectedOpponent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            style={{
              background: "var(--surface-card)",
              borderRadius: 20,
              width: 460,
              maxWidth: "90vw",
              boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
              overflow: "hidden",
              animation: "slide-up 0.25s ease-out",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "24px 28px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: "linear-gradient(135deg, var(--primary-hover), var(--primary))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: "white", fontVariationSettings: "'FILL' 1" }}>swords</span>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Configure Duel</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  vs <strong>{selectedOpponent.name || selectedOpponent.cfHandle}</strong>
                  {selectedOpponent.cfRating ? ` · ${selectedOpponent.cfRating}` : ""}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Question Count */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }}>quiz</span>
                  Number of Questions
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[1, 3, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        borderRadius: 10,
                        border: questionCount === n ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: questionCount === n ? "var(--primary-light)" : "var(--surface-low)",
                        color: questionCount === n ? "var(--primary)" : "var(--text-secondary)",
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {n}
                      <div style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)", marginTop: 2 }}>
                        {n === 1 ? "Sprint" : n === 3 ? "Standard" : "Marathon"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Range */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: 10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }}>tune</span>
                  Rating Range
                </label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    className="n-input"
                    type="number"
                    value={minRating}
                    onChange={e => setMinRating(e.target.value)}
                    placeholder="Min"
                    style={{ flex: 1, textAlign: "center" }}
                  />
                  <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 16 }}>—</span>
                  <input
                    className="n-input"
                    type="number"
                    value={maxRating}
                    onChange={e => setMaxRating(e.target.value)}
                    placeholder="Max"
                    style={{ flex: 1, textAlign: "center" }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>
                  Auto-calculated based on average rating. Adjust freely.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "16px 28px 24px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              borderTop: "1px solid var(--border)",
            }}>
              <button
                className="n-btn-secondary"
                style={{ padding: "10px 24px" }}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="n-btn-primary"
                style={{ padding: "10px 28px" }}
                onClick={handleSendChallenge}
                disabled={sending}
              >
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
                    Send Challenge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
