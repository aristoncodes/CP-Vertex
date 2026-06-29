"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { HintButton } from "@/components/ui/HintButton";
import { PostMortemModal } from "@/components/ui/PostMortemModal";

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
  submissionId?: string | null;
  xpAwarded?: number;
  language?: string;
  timeMs?: number;
  leveledUp?: boolean;
  newLevel?: number;
  editorialUrl?: string;
}

const modeConfig: Record<string, { label: string; color: string; endpoint: string; icon: string; timerMinutes: number }> = {
  blitz:  { label: "Blitz Mode",   color: "var(--warning)",  endpoint: "/api/problems/blitz",    icon: "bolt",                  timerMinutes: 30 },
  drill:  { label: "Drill Mode",   color: "var(--success)",  endpoint: "/api/problems/arena",    icon: "target",                timerMinutes: 60 },
  arena:  { label: "Drill Mode",   color: "var(--success)",  endpoint: "/api/problems/arena",    icon: "target",                timerMinutes: 60 }, // backward compat
  warmup: { label: "Warmup Mode",  color: "var(--info)",     endpoint: "/api/problems/recovery", icon: "speed",                 timerMinutes: 15 },
  boss:   { label: "Boss Fight",   color: "var(--danger)",   endpoint: "/api/problems/boss",     icon: "local_fire_department", timerMinutes: 45 },
};

/* ─── Session Timer Hook ─── */
function useTimer(minutes: number) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setSecondsLeft(minutes * 60);
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const remaining = Math.max(0, minutes * 60 - elapsed);
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [minutes]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const pct = (secondsLeft / (minutes * 60)) * 100;
  const timerClass = pct < 10 ? "danger" : pct < 25 ? "warning" : "";

  return { secondsLeft, display: `${mm}:${ss}`, pct, timerClass };
}

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
  const router = useRouter();
  const mode = searchParams.get("mode") || "blitz";
  const config = modeConfig[mode] || modeConfig.blitz;
  const toast = useToast();

  const [problems, setProblems] = useState<SessionProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error" | "info"; message: string; editorialUrl?: string; submissionId?: string }>>({});
  const [postMortemOpen, setPostMortemOpen] = useState<{ problemId: string; submissionId: string; title: string } | null>(null);

  const timer = useTimer(config.timerMinutes);

  useEffect(() => {
    setLoading(true);
    fetch(config.endpoint).then(r => r.json()).then(d => {
      if (d.problems) setProblems(d.problems);
      else if (d.id) setProblems([d]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [config.endpoint]);

  const verifyProblem = useCallback(async (problem: SessionProblem) => {
    if (completed.has(problem.id)) return;
    setVerifying(problem.cfId);
    setFeedback(prev => ({ ...prev, [problem.id]: { type: "info", message: "Checking Codeforces..." } }));

    try {
      const res = await fetch("/api/problems/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cfId: problem.cfId, mode }),
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
            editorialUrl: data.editorialUrl,
            submissionId: data.submissionId || undefined,
          },
        }));

        // Celebration! (#5)
        if (data.xpAwarded && data.xpAwarded > 0) {
          toast.showXP(data.xpAwarded);
        }
        if (data.leveledUp && data.newLevel) {
          setTimeout(() => toast.showLevelUp(data.newLevel!), 800);
        }
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
  }, [completed, mode, toast]);

  const pct = problems.length > 0 ? (completed.size / problems.length) * 100 : 0;
  const allDone = problems.length > 0 && completed.size === problems.length;

  const feedbackColors: Record<string, string> = {
    success: "var(--success)",
    error: "var(--danger)",
    info: "var(--primary)",
  };

  return (
    <DashboardLayout>
      {/* Header with Timer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: config.color, fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
          <div>
            <h1 style={{ fontSize: "var(--text-2xl)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{config.label}</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {problems.length} problems · {completed.size}/{problems.length} verified
            </p>
          </div>
        </div>

        {/* Session Timer (#4) */}
        {!allDone && !loading && problems.length > 0 && (
          <div className={`session-timer ${timer.timerClass}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>timer</span>
            {timer.display}
          </div>
        )}
      </div>

      <div className="n-progress-track">
        <div className="n-progress-fill" style={{ width: `${pct}%`, background: config.color }} />
      </div>

      {/* Info callout */}
      <div style={{
        padding: "12px 18px", background: "var(--primary-light)",
        border: "1px solid rgba(3, 102, 214, 0.12)", borderRadius: 12, borderLeft: "3px solid var(--primary)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>info</span>
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Solve each problem on Codeforces first, then click <strong>Verify</strong> — we&apos;ll check your last 20 submissions for an AC verdict.
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Generating problems...</div>
      ) : problems.length === 0 ? (
        /* Empty state with CTA (#3) */
        <div style={{ padding: 48, textAlign: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--text-faint)", display: "block", marginBottom: 12 }}>search_off</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No Problems Available</div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
            Connect your Codeforces account in Settings to unlock personalized problems.
          </p>
          <button className="n-btn-primary" onClick={() => router.push("/settings")} style={{ padding: "10px 24px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>settings</span>
            Go to Settings
          </button>
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
                    <div style={{ width: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isCompleted ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>
                          check_circle
                        </span>
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 700, color: config.color, fontVariantNumeric: "tabular-nums" }}>
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
                    {/* Editorial link (#16) */}
                    {fb.type === "success" && fb.submissionId && (
                      <button
                        onClick={() => setPostMortemOpen({ problemId: p.id, submissionId: fb.submissionId!, title: p.title })}
                        style={{
                          marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 600, color: "var(--warning)",
                          padding: "3px 10px", cursor: "pointer",
                          background: "rgba(210,153,34,0.08)", borderRadius: 6,
                          border: "1px solid rgba(210,153,34,0.2)",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>science</span>
                        Post-Mortem
                      </button>
                    )}
                    {fb.editorialUrl && fb.type === "success" && (
                      <a
                        href={fb.editorialUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 600, color: "var(--primary)",
                          textDecoration: "none", padding: "3px 10px",
                          background: "var(--primary-light)", borderRadius: 6,
                          border: "1px solid rgba(3, 102, 214, 0.15)",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>article</span>
                        Editorial
                      </a>
                    )}
                  </div>
                )}

                {/* AI Hints */}
                {!isCompleted && (
                  <HintButton problemId={p.id} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Session Complete — with celebration (#5) */}
      {allDone && (
        <div className="n-card level-up-glow" style={{ padding: "28px 24px", textAlign: "center", borderColor: config.color }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: config.color }}>Session Complete!</div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8, marginBottom: 20 }}>
            All {problems.length} problems verified on Codeforces. Great work!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="n-btn-secondary" onClick={() => router.push("/train")} style={{ padding: "10px 24px" }}>
              Back to Train
            </button>
            <button className="n-btn-primary" onClick={() => router.push("/dashboard")} style={{ padding: "10px 24px" }}>
              View Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Timer expired warning */}
      {timer.secondsLeft === 0 && !allDone && problems.length > 0 && (
        <div style={{
          padding: "16px 20px", borderRadius: 12,
          background: "var(--danger-light)", border: "1px solid var(--danger)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--danger)" }}>alarm</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--danger)" }}>
            Time&apos;s up! You can still verify remaining problems, but the session timer has expired.
          </span>
        </div>
      )}
      {/* Post-Mortem Modal */}
      {postMortemOpen && (
        <PostMortemModal
          submissionId={postMortemOpen.submissionId}
          problemTitle={postMortemOpen.title}
          onClose={() => setPostMortemOpen(null)}
        />
      )}
    </DashboardLayout>
  );
}
