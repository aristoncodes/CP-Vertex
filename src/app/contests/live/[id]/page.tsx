"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LiveContestPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [contestData, setContestData] = useState<any>(null);
  const [problems, setProblems] = useState<any[]>([]);
  const [solvedIndices, setSolvedIndices] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [completedState, setCompletedState] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/contests/virtual").then(r => r.json()).then(d => {
      if (!d.active) { router.push("/contests"); return; }
      setSessionData(d.session); setContestData(d.contest); setProblems(d.problems);
      const start = new Date(d.session.startTime).getTime();
      const end = start + (d.session.duration * 1000);
      setTimeLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    });
  }, [router]);

  useEffect(() => {
    if (timeLeft <= 0 || completedState) return;
    const timer = setInterval(() => { setTimeLeft(p => { if (p <= 1) { clearInterval(timer); syncProgress(); return 0; } return p - 1; }); }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, completedState]);

  const syncProgress = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/contests/virtual/sync", { method: "POST" });
      const data = await res.json();
      if (data.solvedIndices) setSolvedIndices(data.solvedIndices);
      if (data.completed) setCompletedState(data);
    } catch (e) { console.error(e); }
    finally { setSyncing(false); }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (completedState) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--success)" }}>Contest Finished!</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 12 }}>Your virtual performance has been recorded</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 40 }}>
            {[
              { label: "Problems Solved", value: completedState.problemsSolved, color: "var(--text-primary)" },
              { label: "XP Earned", value: `+${completedState.xpAwarded}`, color: "var(--success)" },
              { label: "Rating Change", value: `${completedState.fauxRatingChange > 0 ? "+" : ""}${completedState.fauxRatingChange}`, color: completedState.fauxRatingChange > 0 ? "var(--success)" : "var(--danger)" },
            ].map(s => (
              <div key={s.label} className="n-card" style={{ padding: "24px 32px", textAlign: "center", minWidth: 150 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <button className="n-btn-primary" style={{ marginTop: 40, padding: "12px 32px" }} onClick={() => router.push("/contests")}>
            Back to Contests
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!sessionData) return <DashboardLayout><div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            {contestData?.name || "Virtual Contest"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Simulation Active</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Time Remaining</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: timeLeft < 300 ? "var(--danger)" : "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{formatTime(timeLeft)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Submit on Codeforces, then sync to verify</p>
        <button className="n-btn-secondary" style={{ padding: "8px 24px", fontSize: 13 }} onClick={syncProgress} disabled={syncing}>
          {syncing ? "Syncing..." : "Sync Submissions"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {problems.map((p) => {
          const isSolved = solvedIndices.includes(p.index);
          return (
            <div key={p.index} className="n-card" style={{
              padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center",
              borderColor: isSolved ? "var(--success)" : "var(--border)",
              background: isSolved ? "var(--success-light)" : "var(--surface-card)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: isSolved ? "var(--success)" : "var(--primary)", width: 32 }}>{p.index}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Rating {p.rating}</div>
                </div>
              </div>
              {isSolved ? (
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--success)", padding: "0 16px", display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span> Accepted
                </span>
              ) : (
                <a href={p.cfLink} target="_blank" rel="noreferrer" className="n-btn-primary" style={{ padding: "8px 20px", fontSize: 13, textDecoration: "none" }}>
                  Open on CF ↗
                </a>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
