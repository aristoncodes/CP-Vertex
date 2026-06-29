"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface DuelLive {
  id: string;
  status: string;
  type: string;
  createdAt: string;
  challenger: { name: string; cfHandle: string; level: number; solves: number };
  opponent: { name: string; cfHandle: string; level: number; solves: number } | null;
  problemCount: number;
  recentActivity: { user: string; problem: string; verdict: string; time: string }[];
}

export default function DuelSpectatePage() {
  const params = useParams();
  const duelId = params.id as string;
  const [duel, setDuel] = useState<DuelLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLive = () => {
      fetch(`/api/duels/${duelId}/live`)
        .then((r) => r.json())
        .then((d) => {
          if (d.error) setError(d.error);
          else setDuel(d.duel);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load duel");
          setLoading(false);
        });
    };

    fetchLive();
    // Poll every 10 seconds for live updates
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, [duelId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading duel...</div>
      </DashboardLayout>
    );
  }

  if (error || !duel) {
    return (
      <DashboardLayout>
        <div style={{ padding: 48, textAlign: "center", color: "var(--danger)" }}>{error || "Duel not found"}</div>
      </DashboardLayout>
    );
  }

  const isActive = duel.status === "active";

  return (
    <DashboardLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>swords</span>
        <div>
          <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Duel Spectator
          </h1>
          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{duel.type} · {duel.problemCount} problems</span>
            {isActive && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px",
                borderRadius: 20, background: "var(--success)", color: "white",
                animation: "pulse-dot 2s ease-in-out infinite",
              }}>LIVE</span>
            )}
            {!isActive && (
              <span className="n-badge" style={{ background: "var(--surface-high)", fontSize: 11 }}>{duel.status}</span>
            )}
          </div>
        </div>
      </div>

      {/* Players */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
        {/* Challenger */}
        <div className="n-card" style={{ padding: "24px 28px", textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, var(--primary-hover), var(--primary))",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", fontSize: 22, fontWeight: 700, color: "white",
          }}>
            {duel.challenger.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            {duel.challenger.name || duel.challenger.cfHandle}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Level {duel.challenger.level}</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: "var(--primary)", marginTop: 12, fontVariantNumeric: "tabular-nums" }}>
            {duel.challenger.solves}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Solves</div>
        </div>

        {/* VS */}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--surface-card)", border: "2px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "var(--text-muted)",
        }}>VS</div>

        {/* Opponent */}
        <div className="n-card" style={{ padding: "24px 28px", textAlign: "center" }}>
          {duel.opponent ? (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: "linear-gradient(135deg, var(--danger), #f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 12px", fontSize: 22, fontWeight: 700, color: "white",
              }}>
                {duel.opponent.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                {duel.opponent.name || duel.opponent.cfHandle}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Level {duel.opponent.level}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: "var(--danger)", marginTop: 12, fontVariantNumeric: "tabular-nums" }}>
                {duel.opponent.solves}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Solves</div>
            </>
          ) : (
            <div style={{ padding: 24, color: "var(--text-muted)", fontSize: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, display: "block", marginBottom: 8 }}>hourglass_top</span>
              Waiting for opponent...
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>
            rss_feed
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Live Activity</span>
          {isActive && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>Auto-refreshing every 10s</span>
          )}
        </div>
        {duel.recentActivity.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No submissions yet. The duel is just getting started!
          </div>
        ) : (
          <div>
            {duel.recentActivity.map((activity, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px", borderBottom: i < duel.recentActivity.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 16,
                  color: activity.verdict === "OK" ? "var(--success)" : "var(--danger)",
                  fontVariationSettings: "'FILL' 1",
                }}>
                  {activity.verdict === "OK" ? "check_circle" : "cancel"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{activity.user}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {activity.verdict === "OK" ? "solved" : `got ${activity.verdict} on`}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{activity.problem}</span>
                <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>
                  {new Date(activity.time).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
