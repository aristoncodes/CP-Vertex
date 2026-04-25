"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface OnlineUser {
  id: string;
  name: string | null;
  cfHandle: string | null;
  cfRating: number | null;
  level: number;
  image: string | null;
  xp: number;
}

export default function ArenaPage() {
  const router = useRouter();
  const [duels, setDuels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loadingOnline, setLoadingOnline] = useState(true);

  useEffect(() => {
    fetch("/api/duels").then(r => r.json()).then(d => { if (d.duels) setDuels(d.duels); setLoading(false); }).catch(() => setLoading(false));
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

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Arena</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>Competitive combat zone</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Boss Fight */}
        <div className="n-card" style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(220,38,38,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26, color: "var(--danger)", fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Boss Fight</div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
            Face today&apos;s boss problem. A target 300–500 above your level. Defeat it for massive XP.
          </p>
          <button className="n-btn-primary" style={{ padding: "10px 24px", alignSelf: "flex-start" }} onClick={() => router.push("/arena/boss")}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>swords</span>
            Engage Boss
          </button>
        </div>

        {/* 1v1 Duel */}
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
          <button className="n-btn-secondary" style={{ padding: "10px 24px", alignSelf: "flex-start" }} onClick={() => router.push("/arena/matchmaking")}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
            Find Opponent
          </button>
        </div>
      </div>

      {/* ═══ Online Now ═══ */}
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "var(--surface-low)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Avatar with online dot */}
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "var(--surface-high)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
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
                      background: "#10b981",
                      border: "2px solid var(--surface-low)",
                      boxShadow: "0 0 4px rgba(16,185,129,0.5)",
                    }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {u.name || u.cfHandle || "Unknown"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 8 }}>
                      {u.cfHandle && <span>@{u.cfHandle}</span>}
                      <span style={{ color: "var(--info)" }}>{u.cfRating || "?"}</span>
                      <span style={{ color: "var(--warning)" }}>Lv{u.level}</span>
                    </div>
                  </div>
                </div>
                <button
                  className="n-btn-secondary"
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={() => router.push(`/arena/matchmaking?challenge=${u.id}&name=${encodeURIComponent(u.name || u.cfHandle || "")}`)}
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
        {loading ? (
          <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>Loading duels...</div>
        ) : duels.length === 0 ? (
          <div style={{ fontSize: 14, color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>
            No active duels. Challenge someone from Online Now or Find Opponent!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {duels.map(d => (
              <div key={d.id} onClick={() => router.push(`/arena/duel/${d.id}`)}
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

      {/* Contest Sim */}
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
    </DashboardLayout>
  );
}
