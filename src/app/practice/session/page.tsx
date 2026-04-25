"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface SessionProblem {
  id: string;
  cfId: string;
  cfLink: string;
  title: string;
  rating: number;
  tags: string[];
}

interface VerifyResult {
  verified: boolean;
  verdict: string | null;
  message: string;
  xpAwarded?: number;
  language?: string;
  timeMs?: number;
}

const modeConfig: Record<string, { label: string; color: string; endpoint: string; icon: string }> = {
  blitz:    { label: "Blitz Mode",    color: "var(--warning)",  endpoint: "/api/problems/blitz",    icon: "bolt" },
  arena:    { label: "Arena Mode",    color: "var(--success)",  endpoint: "/api/problems/arena",    icon: "swords" },
  recovery: { label: "Recovery Mode", color: "var(--info)",     endpoint: "/api/problems/recovery", icon: "spa" },
  boss:     { label: "Boss Fight",    color: "var(--danger)",   endpoint: "/api/problems/boss",     icon: "local_fire_department" },
};

export default function SessionPage() {
  return (
    <Suspense fallback={
      <DashboardLayout><div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading session...</div></DashboardLayout>
    }>
      <SessionContent />
    </Suspense>
  );
}

function SessionContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "blitz";
  const config = modeConfig[mode] || modeConfig.blitz;

  const [problems, setProblems] = useState<SessionProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState<string | null>(null); // cfId being verified
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error" | "info"; message: string }>>({});

  useEffect(() => {
    setLoading(true);
    fetch(config.endpoint).then(r => r.json()).then(d => {
      if (d.problems) setProblems(d.problems);
      else if (d.id) setProblems([d]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [config.endpoint]);

  const verifyProblem = useCallback(async (problem: SessionProblem) => {
    if (completed.has(problem.id)) return; // already verified
    setVerifying(problem.cfId);
    setFeedback(prev => ({ ...prev, [problem.id]: { type: "info", message: "Checking Codeforces..." } }));

    try {
      const res = await fetch("/api/problems/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cfId: problem.cfId }),
      });
      const data: VerifyResult = await res.json();

      if (!res.ok) {
        setFeedback(prev => ({
          ...prev,
          [problem.id]: { type: "error", message: data.message || (data as any).error || "Verification failed" },
        }));
        return;
      }

      if (data.verified) {
        setCompleted(prev => new Set(prev).add(problem.id));
        setFeedback(prev => ({
          ...prev,
          [problem.id]: {
            type: "success",
            message: data.xpAwarded
              ? `✅ Accepted in ${data.language}! +${data.xpAwarded} XP`
              : `✅ ${data.message}`,
          },
        }));
      } else {
        setFeedback(prev => ({
          ...prev,
          [problem.id]: { type: "error", message: data.message },
        }));
      }
    } catch {
      setFeedback(prev => ({
        ...prev,
        [problem.id]: { type: "error", message: "Network error — could not reach server." },
      }));
    } finally {
      setVerifying(null);
    }
  }, [completed]);

  const pct = problems.length > 0 ? (completed.size / problems.length) * 100 : 0;

  const feedbackColors: Record<string, string> = {
    success: "var(--success)",
    error: "var(--danger)",
    info: "var(--primary)",
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: config.color, fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{config.label}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
            {problems.length} problems · {completed.size}/{problems.length} verified on Codeforces
          </p>
        </div>
      </div>

      <div className="n-progress-track">
        <div className="n-progress-fill" style={{ width: `${pct}%`, background: config.color }} />
      </div>

      {/* Info callout */}
      <div style={{
        padding: "12px 18px",
        background: "var(--primary-light)",
        border: "1px solid rgba(3, 102, 214, 0.12)",
        borderRadius: 12,
        borderLeft: "3px solid var(--primary)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>info</span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Solve each problem on Codeforces first, then click <strong>Verify</strong> — we&apos;ll check your last 20 submissions for an AC verdict.
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Generating problems...</div>
      ) : problems.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--danger)" }}>
          No problems available. Sync your Codeforces account or try another mode.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {problems.map((p, i) => {
            const isCompleted = completed.has(p.id);
            const isVerifying = verifying === p.cfId;
            const fb = feedback[p.id];

            return (
              <div key={p.id} className="n-card" style={{
                padding: "18px 22px",
                borderColor: isCompleted ? "var(--success)" : "var(--border)",
                background: isCompleted ? "var(--success-light)" : "var(--surface-card)",
                transition: "all 0.3s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Status icon */}
                    <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isCompleted ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 800, color: config.color, fontVariantNumeric: "tabular-nums" }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 16, fontWeight: 700,
                        color: isCompleted ? "var(--success)" : "var(--text-primary)",
                        textDecoration: isCompleted ? "line-through" : "none",
                      }}>
                        {p.title}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: config.color }}>Rating {p.rating}</span>
                        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.cfId}</span>
                        {p.tags?.slice(0, 2).map(tag => (
                          <span key={tag} className="n-tag" style={{ fontSize: 10 }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <a href={p.cfLink} target="_blank" rel="noreferrer" className="n-btn-secondary" style={{ padding: "6px 16px", fontSize: 12, textDecoration: "none" }}>
                      Solve ↗
                    </a>
                    {isCompleted ? (
                      <span style={{ padding: "6px 16px", fontSize: 12, fontWeight: 700, color: "var(--success)" }}>Verified ✓</span>
                    ) : (
                      <button
                        className="n-btn-primary"
                        style={{ padding: "6px 16px", fontSize: 12, opacity: isVerifying ? 0.7 : 1 }}
                        onClick={() => verifyProblem(p)}
                        disabled={isVerifying}
                      >
                        {isVerifying ? (
                          <><span className="material-symbols-outlined" style={{ fontSize: 14, animation: "spin 1s linear infinite" }}>sync</span> Checking...</>
                        ) : (
                          <><span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span> Verify</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback message */}
                {fb && (
                  <div style={{
                    marginTop: 10,
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    color: feedbackColors[fb.type],
                    background: fb.type === "success" ? "var(--success-light)"
                      : fb.type === "error" ? "var(--danger-light)"
                      : "var(--primary-light)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
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

      {problems.length > 0 && completed.size === problems.length && (
        <div className="n-card" style={{ padding: "28px 24px", textAlign: "center", borderColor: config.color }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: config.color }}>Session Complete! 🎉</div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>All problems verified on Codeforces. Great work!</p>
        </div>
      )}
    </DashboardLayout>
  );
}
