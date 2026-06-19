"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ContestProblem { id: string; cfId: string; cfLink: string; title: string; rating: number; tags: string[]; }
interface FeedbackMsg { type: "success" | "error" | "info"; message: string; }

export default function ContestSimPage() {
  const router = useRouter();
  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2 * 60 * 60);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedbackMsg>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/problems/arena").then(r => r.json()).then(d => {
      if (d.problems) setProblems(d.problems.sort((a: ContestProblem, b: ContestProblem) => a.rating - b.rating).slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const startContest = () => {
    setStarted(true);
    timerRef.current = setInterval(() => { setTimeLeft(p => { if (p <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; } return p - 1; }); }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const verifyProblem = useCallback(async (problem: ContestProblem) => {
    if (solved.has(problem.id)) return;
    setVerifying(problem.cfId);
    setFeedback(prev => ({ ...prev, [problem.id]: { type: "info", message: "Checking Codeforces..." } }));

    try {
      const res = await fetch("/api/problems/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cfId: problem.cfId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback(prev => ({ ...prev, [problem.id]: { type: "error", message: data.error || "Verification failed" } }));
        return;
      }

      if (data.verified) {
        setSolved(prev => new Set(prev).add(problem.id));
        setFeedback(prev => ({
          ...prev,
          [problem.id]: {
            type: "success",
            message: data.xpAwarded ? `Accepted in ${data.language}! +${data.xpAwarded} XP` : data.message,
          },
        }));
      } else {
        setFeedback(prev => ({ ...prev, [problem.id]: { type: "error", message: data.message } }));
      }
    } catch {
      setFeedback(prev => ({ ...prev, [problem.id]: { type: "error", message: "Network error" } }));
    } finally {
      setVerifying(null);
    }
  }, [solved]);

  const labels = ["A", "B", "C", "D", "E"];
  const timerColor = timeLeft < 600 ? "var(--danger)" : timeLeft < 1800 ? "var(--warning)" : "var(--success)";

  const feedbackColors: Record<string, string> = { success: "var(--success)", error: "var(--danger)", info: "var(--primary)" };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Contest Simulation</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>Codeforces Div.2 Virtual Round</p>
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: timerColor, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      {!started ? (
        <div className="n-card" style={{ padding: "48px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>Ready to begin?</div>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 12 }}>
            {problems.length} problems will be revealed. You have 2 hours.
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 32 }}>
            Solve on Codeforces, then click <strong>Verify</strong> — we&apos;ll check your last 20 submissions.
          </p>
          <button className="n-btn-primary" style={{ padding: "14px 48px", fontSize: 16 }} onClick={startContest} disabled={loading || problems.length === 0}>
            {loading ? "Loading..." : "Start Round →"}
          </button>
        </div>
      ) : timeLeft === 0 ? (
        <div className="n-card" style={{ padding: "48px 32px", textAlign: "center", borderColor: solved.size >= 3 ? "var(--success)" : "var(--danger)" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: solved.size >= 3 ? "var(--success)" : "var(--danger)" }}>
            {solved.size >= 3 ? "Round Passed!" : "Round Failed"}
          </div>
          <p style={{ fontSize: 16, color: "var(--text-muted)", marginTop: 12 }}>{solved.size}/{problems.length} problems verified</p>
          <button className="n-btn-secondary" style={{ padding: "10px 24px", marginTop: 24 }} onClick={() => router.push("/arena")}>Return to Arena</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {problems.map((p, i) => {
            const isSolved = solved.has(p.id);
            const isVerifyingThis = verifying === p.cfId;
            const fb = feedback[p.id];

            return (
              <div key={p.id} className="n-card" style={{
                padding: "18px 22px",
                borderColor: isSolved ? "var(--success)" : "var(--border)",
                background: isSolved ? "var(--success-light)" : "var(--surface-card)",
                transition: "all 0.3s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 36 }}>
                      {isSolved ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : (
                        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{labels[i] || String(i + 1)}</span>
                      )}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 16, fontWeight: 700,
                        color: isSolved ? "var(--success)" : "var(--text-primary)",
                        textDecoration: isSolved ? "line-through" : "none",
                      }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Rating {p.rating} · {p.cfId}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <a href={p.cfLink} target="_blank" rel="noreferrer" className="n-btn-secondary" style={{ padding: "6px 16px", fontSize: 12, textDecoration: "none" }}>
                      Solve ↗
                    </a>
                    {isSolved ? (
                      <span style={{ padding: "6px 16px", fontSize: 12, fontWeight: 700, color: "var(--success)" }}>✓ AC</span>
                    ) : (
                      <button className="n-btn-primary" style={{ padding: "6px 16px", fontSize: 12, opacity: isVerifyingThis ? 0.7 : 1 }} onClick={() => verifyProblem(p)} disabled={isVerifyingThis}>
                        {isVerifyingThis ? "Checking..." : "Verify AC"}
                      </button>
                    )}
                  </div>
                </div>

                {fb && (
                  <div style={{
                    marginTop: 10, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                    color: feedbackColors[fb.type],
                    background: fb.type === "success" ? "var(--success-light)" : fb.type === "error" ? "var(--danger-light)" : "var(--primary-light)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                      {fb.type === "success" ? "check_circle" : fb.type === "error" ? "error" : "hourglass_top"}
                    </span>
                    {fb.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
