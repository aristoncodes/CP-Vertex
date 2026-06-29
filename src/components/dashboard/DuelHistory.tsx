"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface DuelRecord {
  id: string;
  status: string;
  winnerId: string | null;
  questionCount: number;
  timeLimit: number;
  startedAt: string;
  p1Progress: number;
  p2Progress: number;
  player1: { id: string; name: string | null; cfHandle: string | null };
  player2: { id: string; name: string | null; cfHandle: string | null };
}

type DuelResult = "win" | "loss" | "draw";

function getResult(duel: DuelRecord, userId: string): DuelResult {
  if (duel.winnerId === userId) return "win";
  if (duel.winnerId && duel.winnerId !== userId) return "loss";
  return "draw";
}

const resultConfig: Record<DuelResult, { label: string; color: string; bg: string; icon: string }> = {
  win:  { label: "W", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 12%, transparent)", icon: "emoji_events" },
  loss: { label: "L", color: "var(--danger)", bg: "color-mix(in srgb, var(--danger) 12%, transparent)", icon: "close" },
  draw: { label: "D", color: "var(--text-muted)", bg: "color-mix(in srgb, var(--text-muted) 12%, transparent)", icon: "remove" },
};

export function DuelHistory() {
  const { data: session } = useSession();
  const router = useRouter();
  const [duels, setDuels] = useState<DuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    fetch("/api/duels?history=true")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.duels)) setDuels(d.duels.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    wins: duels.filter((d) => userId && d.winnerId === userId).length,
    losses: duels.filter((d) => userId && d.winnerId && d.winnerId !== userId).length,
    draws: duels.filter((d) => !d.winnerId).length,
  };
  const total = stats.wins + stats.losses + stats.draws;
  const winRate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="n-section-label" style={{ margin: 0 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6, color: "var(--danger)", fontVariationSettings: "'FILL' 1" }}
          >
            swords
          </span>
          Duel Record
        </div>
        <button
          onClick={() => router.push("/compete")}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--primary)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            fontFamily: "'Inter', sans-serif",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          Arena →
        </button>
      </div>

      <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 24, color: "var(--text-faint)", animation: "spin 1s linear infinite" }}
            >
              progress_activity
            </span>
          </div>
        ) : duels.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, color: "var(--text-faint)", marginBottom: 8, display: "block" }}
            >
              swords
            </span>
            <div style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>
              No duels played yet
            </div>
            <div style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 4 }}>
              Challenge a friend from the Arena to get started!
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--success)", letterSpacing: "-0.02em" }}>
                    {stats.wins}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Wins
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--danger)", letterSpacing: "-0.02em" }}>
                    {stats.losses}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Losses
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "-0.02em" }}>
                    {stats.draws}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Draws
                  </div>
                </div>
              </div>

              {/* Win rate ring */}
              <div style={{ position: "relative", width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border)" strokeWidth="4" />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke={winRate >= 50 ? "var(--success)" : "var(--danger)"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(winRate / 100) * 125.6} 125.6`}
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                  />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: winRate >= 50 ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {winRate}%
                </div>
              </div>
            </div>

            {/* Result streak dots */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "12px 18px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginRight: 8 }}>Last {duels.length}:</span>
              {duels.map((duel) => {
                const result = userId ? getResult(duel, userId) : "draw";
                const cfg = resultConfig[result];
                return (
                  <div
                    key={duel.id}
                    title={`vs ${
                      (duel.player1.id === userId
                        ? duel.player2.name || duel.player2.cfHandle
                        : duel.player1.name || duel.player1.cfHandle) || "?"
                    } — ${cfg.label}`}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 6,
                      background: cfg.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: cfg.color,
                      cursor: "pointer",
                      transition: "transform 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onClick={() => router.push(`/compete/duel/${duel.id}`)}
                  >
                    {cfg.label}
                  </div>
                );
              })}
            </div>

            {/* Recent duels list */}
            {duels.slice(0, 4).map((duel, i) => {
              const result = userId ? getResult(duel, userId) : "draw";
              const cfg = resultConfig[result];
              const opponent =
                duel.player1.id === userId ? duel.player2 : duel.player1;
              const opponentName = opponent?.name || opponent?.cfHandle || "Unknown";
              const myProgress = duel.player1.id === userId ? duel.p1Progress : duel.p2Progress;
              const theirProgress = duel.player1.id === userId ? duel.p2Progress : duel.p1Progress;

              return (
                <div
                  key={duel.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 18px",
                    borderBottom: i < 3 ? "1px solid var(--border)" : "none",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high, rgba(0,0,0,0.02))")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => router.push(`/compete/duel/${duel.id}`)}
                >
                  {/* Result indicator */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: cfg.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 14,
                        color: cfg.color,
                        fontVariationSettings: result === "win" ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {cfg.icon}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      vs {opponentName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {myProgress}/{duel.questionCount} — {theirProgress}/{duel.questionCount} · {duel.questionCount}Q
                    </div>
                  </div>

                  {/* Result label */}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: cfg.color,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: cfg.bg,
                    }}
                  >
                    {result === "win" ? "Victory" : result === "loss" ? "Defeat" : "Draw"}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
