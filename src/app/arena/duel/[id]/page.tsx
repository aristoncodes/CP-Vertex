"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface DuelData {
  id: string;
  status: string;
  problemId: string;
  endsAt: string;
  questionCount?: number;
  player1: { name: string; cfHandle: string };
  player2: { name: string; cfHandle: string };
  problem: { title: string; rating: number; cfLink: string };
  p1WaCount: number;
  p2WaCount: number;
  winnerId: string | null;
  player1Id: string;
  player2Id: string;
}

export default function DuelCombatPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [duel, setDuel] = useState<DuelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/user/me");
        if (meRes.ok) { const d = await meRes.json(); setUserId(d.id); }
        const res = await fetch(`/api/duels/${id}`);
        if (res.ok) { const d = await res.json(); setDuel(d.duel); }
        else { alert("Failed to fetch duel"); router.push("/arena"); }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id, router]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/duels/${id}/verify`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setDuel(data.duel);
        if (data.duel.status === "completed") {
          alert(`Duel concluded! Winner: ${data.duel.winnerId === duel?.player1Id ? duel?.player1.name : duel?.player2.name}`);
        } else {
          alert("No AC verdicts found yet.");
        }
      } else {
        alert("Error: " + data.error);
      }
    } catch { alert("Verification failed."); }
    finally { setVerifying(false); }
  };

  const handleAccept = async () => {
    setVerifying(true);
    try {
      const res = await fetch(`/api/duels/${id}/accept`, { method: "PATCH" });
      if (res.ok) setDuel({ ...duel!, status: "active" });
      else { const d = await res.json(); alert("Error: " + d.error); }
    } catch { alert("Accept failed."); }
    finally { setVerifying(false); }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      const res = await fetch(`/api/duels/${id}/decline`, { method: "PATCH" });
      if (res.ok) {
        setDuel({ ...duel!, status: "declined" });
      } else {
        const d = await res.json();
        alert("Error: " + d.error);
      }
    } catch { alert("Decline failed."); }
    finally { setDeclining(false); }
  };

  if (loading) return <DashboardLayout><div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading duel...</div></DashboardLayout>;
  if (!duel) return null;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active": return { bg: "var(--success-light)", color: "var(--success)" };
      case "pending": return { bg: "var(--warning-light)", color: "var(--warning)" };
      case "completed": return { bg: "var(--primary-light)", color: "var(--primary)" };
      case "declined": return { bg: "var(--danger-light)", color: "var(--danger)" };
      default: return { bg: "var(--surface-high)", color: "var(--text-muted)" };
    }
  };
  const statusStyle = getStatusStyle(duel.status);

  return (
    <DashboardLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <button
          onClick={() => router.push("/arena")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", display: "flex", alignItems: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          1v1 Duel
        </h1>
        <span style={{
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          background: statusStyle.bg,
          color: statusStyle.color,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          {duel.status}
        </span>
        {duel.questionCount && duel.questionCount > 1 && (
          <span style={{
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            background: "var(--info-light)",
            color: "var(--info)",
          }}>
            {duel.questionCount} questions
          </span>
        )}
      </div>

      <div className="n-card" style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 32 }}>
        {/* VS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)" }}>{duel.player1.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{duel.player1.cfHandle}</div>
            <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8, fontWeight: 600 }}>{duel.p1WaCount} wrong attempts</div>
          </div>
          <div style={{
            fontSize: 36, fontWeight: 900, color: "var(--text-muted)", padding: "0 24px",
            background: "linear-gradient(135deg, var(--primary-light), var(--danger-light))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>VS</div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--warning)" }}>{duel.player2.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{duel.player2.cfHandle}</div>
            <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 8, fontWeight: 600 }}>{duel.p2WaCount} wrong attempts</div>
          </div>
        </div>

        {/* Pending — Accept / Decline for player2 */}
        {duel.status === "pending" && duel.player2Id === userId ? (
          <div style={{
            textAlign: "center", padding: "24px 0",
            background: "var(--warning-light)", borderRadius: 14, margin: "0 -4px",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 36, color: "var(--warning)", display: "block", marginBottom: 8 }}>
              swords
            </span>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
              You have been challenged to a duel!
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                className="n-btn-secondary"
                onClick={handleDecline}
                disabled={declining}
                style={{
                  padding: "12px 28px",
                  color: "var(--danger)",
                  borderColor: "rgba(220,38,38,0.3)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                {declining ? "Declining..." : "Decline"}
              </button>
              <button className="n-btn-primary" onClick={handleAccept} disabled={verifying} style={{ padding: "12px 32px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                {verifying ? "Accepting..." : "Accept Duel"}
              </button>
            </div>
          </div>
        ) : duel.status === "pending" ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", margin: "0 auto 8px", animation: "pulse-dot 2s ease-in-out infinite" }}>
              hourglass_top
            </span>
            Waiting for opponent to accept...
          </div>
        ) : duel.status === "declined" ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", margin: "0 auto 8px", color: "var(--danger)" }}>
              block
            </span>
            This duel was declined.
          </div>
        ) : (
          <>
            <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "24px 0", textAlign: "center" }}>
              <div className="n-section-label" style={{ justifyContent: "center" }}>Problem</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "12px 0" }}>{duel.problem.title}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 14 }}>
                <span style={{ fontWeight: 600, color: "var(--danger)" }}>Rating: {duel.problem.rating}</span>
                <a href={duel.problem.cfLink} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                  Open on Codeforces ↗
                </a>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {duel.status === "active" && (
                <button className="n-btn-primary" onClick={handleVerify} disabled={verifying} style={{ padding: "12px 32px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                  {verifying ? "Checking..." : "Verify Submission"}
                </button>
              )}
              {duel.status === "completed" && duel.winnerId && (
                <div style={{
                  padding: "16px 28px",
                  borderRadius: 12,
                  background: duel.winnerId === userId ? "var(--success-light)" : "var(--danger-light)",
                  textAlign: "center",
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: 28,
                    color: duel.winnerId === userId ? "var(--success)" : "var(--danger)",
                    fontVariationSettings: "'FILL' 1",
                  }}>
                    {duel.winnerId === userId ? "emoji_events" : "sentiment_dissatisfied"}
                  </span>
                  <div style={{
                    fontSize: 18, fontWeight: 800, marginTop: 4,
                    color: duel.winnerId === userId ? "var(--success)" : "var(--danger)",
                  }}>
                    {duel.winnerId === userId ? "Victory!" : "Defeat"}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
