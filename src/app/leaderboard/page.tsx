"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const getRankTier = (level: number) => {
  if (level >= 40) return { tier: "Radiant", color: "#dc2626" };
  if (level >= 30) return { tier: "Immortal", color: "#7c3aed" };
  if (level >= 20) return { tier: "Diamond", color: "#0891b2" };
  if (level >= 10) return { tier: "Gold", color: "#d97706" };
  if (level >= 5) return { tier: "Silver", color: "#64748b" };
  return { tier: "Bronze", color: "#a16207" };
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [loadingChallenge, setLoadingChallenge] = useState<string | null>(null);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Global");

  useEffect(() => {
    setLoading(true);
    let url = "/api/leaderboard";
    if (filter === "Weekly") url = "/api/leaderboard?period=weekly";
    if (filter === "Friends") url = "/api/leaderboard?scope=friends";

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard) {
          const formatted = data.leaderboard.map((u: any, idx: number) => {
            const { tier, color } = getRankTier(u.level || 1);
            return { rank: u.rank || (idx + 1), id: u.id, name: u.name || "Unknown", handle: u.cfHandle || "—", rating: u.cfRating || 0, xp: u.xp || 0, level: u.level || 1, rankTier: tier, color };
          });
          setRankings(formatted);
        } else {
          setRankings([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setRankings([]);
        setLoading(false);
      });
  }, [filter]);

  const handleChallenge = async (opponentId: string) => {
    setLoadingChallenge(opponentId);
    try {
      const res = await fetch("/api/duels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opponentId }) });
      const data = await res.json();
      if (!res.ok) { alert("Error: " + (data.error || "Failed")); return; }
      router.push(`/arena/duel/${data.duel.id}`);
    } catch { alert("Matchmaking server offline."); }
    finally { setLoadingChallenge(null); }
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Leaderboard</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>Global rankings</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Global", "Weekly", "Friends"].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setFilter(tab)}
              className={filter === tab ? "n-btn-primary" : "n-btn-secondary"} 
              style={{ padding: "8px 18px", fontSize: 13 }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>Loading rankings...</div>
      ) : rankings.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>No users on the leaderboard yet.</div>
      ) : (
        <>
          {/* Podium */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 20, padding: "24px 0" }}>
            {[rankings[1], rankings[0], rankings[2]].map((r, i) => {
              if (!r) return null;
              const heights = [130, 170, 110];
              const medals = ["🥈", "🥇", "🥉"];
              return (
                <div key={r.rank} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 28 }}>{medals[i]}</span>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{r.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.rating}</div>
                  <div style={{
                    width: 130, height: heights[i], borderRadius: "16px 16px 0 0",
                    background: `linear-gradient(180deg, ${r.color}18, var(--surface-card))`,
                    border: `1px solid ${r.color}30`, borderBottom: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28, fontWeight: 800, color: r.color,
                  }}>
                    #{r.rank}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div className="n-card" style={{ overflow: "hidden", padding: 0 }}>
            <table className="n-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>Rank</th>
                  <th>Name</th>
                  <th style={{ width: 100 }}>Handle</th>
                  <th style={{ width: 80, textAlign: "center" }}>Rating</th>
                  <th style={{ width: 70, textAlign: "center" }}>Level</th>
                  <th style={{ width: 100, textAlign: "center" }}>XP</th>
                  <th style={{ width: 90 }}>Tier</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr key={r.rank}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--text-primary)" }}>{r.rank}</td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.name}</td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>{r.handle}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: r.color }}>{r.rating}</td>
                    <td style={{ textAlign: "center" }}>{r.level}</td>
                    <td style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>{r.xp.toLocaleString()}</td>
                    <td>
                      <span className="n-badge" style={{ background: `${r.color}15`, color: r.color }}>{r.rankTier}</span>
                    </td>
                    <td>
                      <button className="n-btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => handleChallenge(r.id)} disabled={loadingChallenge === r.id}>
                        {loadingChallenge === r.id ? "..." : "Challenge"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
