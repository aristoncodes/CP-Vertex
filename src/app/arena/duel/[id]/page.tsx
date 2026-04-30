"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface DuelData {
  id: string;
  status: string;
  problemIds: string[];
  startedAt: string;
  endsAt: string;
  questionCount: number;
  player1: { name: string; cfHandle: string };
  player2: { name: string; cfHandle: string };
  problems: { id: string; title: string; rating: number; cfLink: string }[];
  p1WaCount: number;
  p2WaCount: number;
  p1Progress: number;
  p2Progress: number;
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
  const [cancelling, setCancelling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
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
        } else if (data.duel.p1Progress > duel!.p1Progress || data.duel.p2Progress > duel!.p2Progress) {
          // someone advanced but didn't finish yet
          // no alert needed, UI will update
        } else {
          alert("No AC verdicts found for the current problem yet.");
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

  const handleCancel = async () => {
    if (!window.confirm("Cancel this duel challenge?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/duels/${id}/cancel`, { method: "PATCH" });
      if (res.ok) {
        setDuel({ ...duel!, status: "cancelled" });
      } else {
        const d = await res.json();
        alert("Error: " + d.error);
      }
    } catch { alert("Cancel failed."); }
    finally { setCancelling(false); }
  };

  // Auto-cancel countdown timer for pending duels
  useEffect(() => {
    if (!duel || duel.status !== "pending") {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - new Date(duel.startedAt).getTime();
      const remaining = Math.max(0, 120 - Math.floor(elapsed / 1000));
      setCountdown(remaining);

      // Auto-expire on client side — refetch to get server-side expiry
      if (remaining <= 0) {
        fetch(`/api/duels/${id}`)
          .then(r => r.json())
          .then(d => { if (d.duel) setDuel(d.duel); })
          .catch(() => {});
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [duel?.status, duel?.startedAt, id]);

  if (loading) return <DashboardLayout><div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading duel...</div></DashboardLayout>;
  if (!duel) return null;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active": return { bg: "var(--success-light)", color: "var(--success)" };
      case "pending": return { bg: "var(--warning-light)", color: "var(--warning)" };
      case "completed": return { bg: "var(--primary-light)", color: "var(--primary)" };
      case "declined": return { bg: "var(--danger-light)", color: "var(--danger)" };
      case "cancelled": return { bg: "var(--danger-light)", color: "var(--danger)" };
      case "expired": return { bg: "var(--surface-high)", color: "var(--text-muted)" };
      default: return { bg: "var(--surface-high)", color: "var(--text-muted)" };
    }
  };
  const statusStyle = getStatusStyle(duel.status);

  // Determine current problem for this user
  const isPlayer2 = userId === duel.player2Id;
  const myProgress = isPlayer2 ? duel.p2Progress : duel.p1Progress;
  const opponentProgress = isPlayer2 ? duel.p1Progress : duel.p2Progress;
  const currentProblem = duel.problems[Math.min(myProgress, duel.problems.length - 1)];

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
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>{duel.p1WaCount} wrong attempts</div>
              {duel.questionCount > 1 && (
                <div style={{ fontSize: 12, color: "var(--info)", fontWeight: 600 }}>Solved: {duel.p1Progress}/{duel.questionCount}</div>
              )}
            </div>
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
            <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "flex-end" }}>
              {duel.questionCount > 1 && (
                <div style={{ fontSize: 12, color: "var(--info)", fontWeight: 600 }}>Solved: {duel.p2Progress}/{duel.questionCount}</div>
              )}
              <div style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>{duel.p2WaCount} wrong attempts</div>
            </div>
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
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, display: "block", margin: "0 auto 8px", animation: "pulse-dot 2s ease-in-out infinite", color: "var(--warning)" }}>
              hourglass_top
            </span>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Waiting for opponent to accept...
            </p>

            {/* Countdown timer */}
            {countdown !== null && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 10,
                background: countdown <= 30 ? "var(--danger-light)" : "var(--surface-high)",
                fontSize: 13, fontWeight: 700,
                color: countdown <= 30 ? "var(--danger)" : "var(--text-muted)",
                marginBottom: 16,
                transition: "all 0.3s ease",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>timer</span>
                Auto-expires in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
              </div>
            )}

            {/* Cancel button for challenger */}
            {duel.player1Id === userId && (
              <div style={{ marginTop: 8 }}>
                <button
                  className="n-btn-secondary"
                  onClick={handleCancel}
                  disabled={cancelling}
                  style={{
                    padding: "10px 24px",
                    color: "var(--danger)",
                    borderColor: "rgba(220,38,38,0.3)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  {cancelling ? "Cancelling..." : "Cancel Duel"}
                </button>
              </div>
            )}
          </div>
        ) : duel.status === "declined" ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", margin: "0 auto 8px", color: "var(--danger)" }}>
              block
            </span>
            This duel was declined.
          </div>
        ) : duel.status === "cancelled" ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", margin: "0 auto 8px", color: "var(--danger)" }}>
              cancel
            </span>
            This duel was cancelled by the challenger.
          </div>
        ) : duel.status === "expired" ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0", fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, display: "block", margin: "0 auto 8px", color: "var(--text-muted)" }}>
              timer_off
            </span>
            This duel expired — opponent didn&apos;t respond in time.
          </div>
        ) : (
          <>
            <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "24px 0", textAlign: "center" }}>
              <div className="n-section-label" style={{ justifyContent: "center" }}>
                {duel.questionCount > 1 && myProgress < duel.questionCount 
                  ? `Problem ${myProgress + 1} of ${duel.questionCount}` 
                  : "Problem"}
              </div>
              
              {myProgress >= duel.questionCount ? (
                 <div style={{ fontSize: 20, fontWeight: 800, color: "var(--success)", margin: "12px 0" }}>
                   You have solved all questions! Waiting for duel to conclude...
                 </div>
              ) : currentProblem ? (
                <>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "12px 0" }}>{currentProblem.title}</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: "var(--danger)" }}>Rating: {currentProblem.rating}</span>
                    <a href={currentProblem.cfLink} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
                      Open on Codeforces ↗
                    </a>
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--text-muted)" }}>Error loading problem...</div>
              )}
            </div>
            
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {duel.status === "active" && myProgress < duel.questionCount && (
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
              {duel.status === "completed" && duel.winnerId === null && (
                <div style={{
                  padding: "16px 28px",
                  borderRadius: 12,
                  background: "var(--warning-light)",
                  textAlign: "center",
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: 28,
                    color: "var(--warning)",
                    fontVariationSettings: "'FILL' 1",
                  }}>
                    balance
                  </span>
                  <div style={{
                    fontSize: 18, fontWeight: 800, marginTop: 4,
                    color: "var(--warning)",
                  }}>
                    Draw!
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
