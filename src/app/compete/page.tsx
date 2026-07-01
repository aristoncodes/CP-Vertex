"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getRatingColor } from "@/lib/colors";

interface OnlineUser {
  id: string;
  name: string | null;
  cfHandle: string | null;
  cfRating: number | null;
  level: number;
  image: string | null;
  xp: number;
}

const getRankTier = (level: number) => {
  if (level >= 40) return { tier: "Radiant", color: "#dc2626" };
  if (level >= 30) return { tier: "Immortal", color: "#7c3aed" };
  if (level >= 20) return { tier: "Diamond", color: "#0891b2" };
  if (level >= 10) return { tier: "Gold", color: "#d97706" };
  if (level >= 5) return { tier: "Silver", color: "#64748b" };
  return { tier: "Bronze", color: "#a16207" };
};

type Tab = "duels" | "leaderboard";

export default function CompetePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("duels");

  // Duels state
  const [duels, setDuels] = useState<any[]>([]);
  const [loadingDuels, setLoadingDuels] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(true);

  // Leaderboard state
  const [rankings, setRankings] = useState<any[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [filter, setFilter] = useState("Global");
  const [loadingChallenge, setLoadingChallenge] = useState<string | null>(null);

  // Fetch duels
  useEffect(() => {
    fetch("/api/duels").then(r => r.json()).then(d => { if (d.duels) setDuels(d.duels); setLoadingDuels(false); }).catch(() => setLoadingDuels(false));
  }, []);

  // Fetch online users + refresh every 30s
  useEffect(() => {
    const fetchOnline = () => {
      fetch("/api/user/online")
        .then(r => r.json())
        .then(d => { if (d.users) setOnlineUsers(d.users); setLoadingOnline(false); })
        .catch(() => setLoadingOnline(false));
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch leaderboard
  useEffect(() => {
    setLoadingRankings(true);
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
        setLoadingRankings(false);
      })
      .catch(() => { setRankings([]); setLoadingRankings(false); });
  }, [filter]);

  const handleChallenge = async (opponentId: string) => {
    setLoadingChallenge(opponentId);
    try {
      const res = await fetch("/api/duels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opponentId }) });
      const data = await res.json();
      if (!res.ok) { alert("Error: " + (data.error || "Failed")); return; }
      router.push(`/compete/duel/${data.duel.id}`);
    } catch { alert("Matchmaking server offline."); }
    finally { setLoadingChallenge(null); }
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "duels", label: "Duels", icon: "swords" },
    { key: "leaderboard", label: "Leaderboard", icon: "leaderboard" },
  ];

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Compete</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>Head-to-head battles and global rankings</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {/* ═══ Duels Tab ═══ */}
      {activeTab === "duels" && (
        <>
          {/* 1v1 Duel CTA */}
          <div className="n-card" style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(5,150,105,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 26, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>group</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>1v1 Duel</div>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
              Challenge another user. Same problem. First to solve wins. Prove your superiority.
            </p>
            <button className="n-btn-primary" style={{ padding: "10px 24px", alignSelf: "flex-start" }} onClick={() => router.push("/compete/matchmaking")}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
              Find Opponent
            </button>
          </div>

          {/* Online Now */}
          <div className="n-card" style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{
                width: 9, height: 9, borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px rgba(16,185,129,0.5)",
                animation: "pulse-dot 2s ease-in-out infinite",
              }} />
              <div className="n-section-label" style={{ margin: 0 }}>
                Online Now
                <span style={{ color: "var(--text-faint)", fontWeight: 500, marginLeft: 6 }}>
                  ({onlineUsers.length})
                </span>
              </div>
            </div>

            {loadingOnline ? (
              <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>Scanning for online users...</div>
            ) : onlineUsers.length === 0 ? (
              <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", margin: "0 auto 8px", opacity: 0.3 }}>person_off</span>
                No other users online right now. Check back soon!
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {onlineUsers.map(u => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 16px", background: "var(--surface-low)", borderRadius: 12,
                      border: "1px solid var(--border)", transition: "border-color 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", background: "var(--surface-high)",
                          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                        }}>
                          {u.image ? (
                            <img src={u.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--text-muted)" }}>person</span>
                          )}
                        </div>
                        <span style={{
                          position: "absolute", bottom: -1, right: -1,
                          width: 10, height: 10, borderRadius: "50%",
                          background: "#10b981", border: "2px solid var(--surface-low)",
                          boxShadow: "0 0 4px rgba(16,185,129,0.5)",
                        }} />
                      </div>
                      <div>
                        <Link
                          href={`/profile/${u.cfHandle || u.name || u.id}`}
                          style={{ fontSize: 13, fontWeight: 700, color: getRatingColor(u.cfRating || 0), textDecoration: "none" }}
                        >
                          {u.name || u.cfHandle || "Unknown"}
                        </Link>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 8 }}>
                          {u.cfHandle && <span>@{u.cfHandle}</span>}
                          <span style={{ color: getRatingColor(u.cfRating || 0), fontWeight: 600 }}>{u.cfRating || "?"}</span>
                          <span style={{ color: "var(--warning)" }}>Lv{u.level}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      className="n-btn-secondary"
                      style={{ padding: "6px 14px", fontSize: 12 }}
                      onClick={() => router.push(`/compete/matchmaking?challenge=${u.id}&name=${encodeURIComponent(u.name || u.cfHandle || "")}`)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>swords</span>
                      Duel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Duels */}
          <div className="n-card" style={{ padding: "20px 24px" }}>
            <div className="n-section-label">Active & Pending Duels</div>
            {loadingDuels ? (
              <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>Loading duels...</div>
            ) : duels.length === 0 ? (
              <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
                No active duels. Challenge someone from Online Now or Find Opponent!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                {duels.map(d => (
                  <div key={d.id} onClick={() => router.push(`/compete/duel/${d.id}`)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: "var(--surface-low)", padding: "12px 18px", borderRadius: 12, cursor: "pointer",
                      border: "1px solid var(--border)", transition: "border-color 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      <span style={{ color: "var(--text-primary)" }}>{d.player1.name}</span>
                      <span style={{ color: "var(--text-muted)", margin: "0 10px", fontWeight: 400 }}>vs</span>
                      <span style={{ color: "var(--text-primary)" }}>{d.player2.name}</span>
                    </div>
                    <span className="n-badge" style={{
                      background: d.status === "active" ? "var(--success-light)" : "var(--warning-light)",
                      color: d.status === "active" ? "var(--success)" : "var(--warning)",
                    }}>{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══ Leaderboard Tab ═══ */}
      {activeTab === "leaderboard" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
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

          {loadingRankings ? (
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
                        fontSize: 28, fontWeight: 700, color: r.color,
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
        </>
      )}
    </DashboardLayout>
  );
}
