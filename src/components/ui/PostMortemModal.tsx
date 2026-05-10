"use client";
import { useState } from "react";

interface PostMortemAnalysis {
  pattern: string;
  errorCategory: string;
  rootCause: string;
  actionItem: string;
  nextProblemHint: string;
}

const FAILURE_OPTIONS = [
  { value: "wrong_approach", label: "Wrong Approach", icon: "route", color: "var(--danger)" },
  { value: "edge_case", label: "Edge Case", icon: "bug_report", color: "var(--warning)" },
  { value: "tle", label: "TLE / Performance", icon: "timer_off", color: "var(--danger)" },
  { value: "off_by_one", label: "Off-by-One", icon: "exposure_neg_1", color: "var(--warning)" },
  { value: "overflow", label: "Integer Overflow", icon: "all_inclusive", color: "var(--danger)" },
  { value: "misread", label: "Misread Problem", icon: "visibility_off", color: "var(--info, var(--primary))" },
];

export function PostMortemModal({
  submissionId,
  problemTitle,
  onClose,
}: {
  submissionId: string;
  problemTitle: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"form" | "submitting" | "result">("form");
  const [failureReasons, setFailureReasons] = useState<string[]>([]);
  const [howFixed, setHowFixed] = useState("");
  const [difficultyFelt, setDifficultyFelt] = useState(3);
  const [confidenceNext, setConfidenceNext] = useState<"yes" | "maybe" | "no">("maybe");
  const [analysis, setAnalysis] = useState<PostMortemAnalysis | null>(null);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [error, setError] = useState("");

  const toggleReason = (r: string) => {
    setFailureReasons((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const submit = async () => {
    if (failureReasons.length === 0) {
      setError("Select at least one failure reason");
      return;
    }
    setStep("submitting");
    setError("");
    try {
      const res = await fetch("/api/postmortems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          failureReasons,
          howFixed: howFixed || undefined,
          difficultyFelt,
          confidenceNext,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setStep("form");
        return;
      }
      setXpAwarded(data.xpAwarded || 30);
      setAnalysis(data.aiAnalysis || null);
      setStep("result");
    } catch {
      setError("Network error");
      setStep("form");
    }
  };

  const categoryColors: Record<string, string> = {
    Mathematical: "var(--info, var(--primary))",
    Implementation: "var(--warning)",
    Conceptual: "var(--danger)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--surface-card, var(--surface))",
          borderRadius: 16,
          border: "1px solid var(--border)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22, color: "var(--warning)", fontVariationSettings: "'FILL' 1" }}
            >
              science
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Post-Mortem Analysis
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{problemTitle}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {step === "form" && (
            <>
              {/* Failure Reasons */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  What went wrong? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(select all that apply)</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {FAILURE_OPTIONS.map((opt) => {
                    const selected = failureReasons.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleReason(opt.value)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: `1px solid ${selected ? opt.color : "var(--border)"}`,
                          background: selected ? `${opt.color}11` : "transparent",
                          color: selected ? opt.color : "var(--text-secondary)",
                          fontSize: 12,
                          fontWeight: selected ? 600 : 500,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          textAlign: "left",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: selected ? "'FILL' 1" : "" }}>
                          {opt.icon}
                        </span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* How I Fixed It */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                  How did you fix it? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span>
                </div>
                <textarea
                  value={howFixed}
                  onChange={(e) => setHowFixed(e.target.value)}
                  placeholder="e.g., 'Changed O(N²) nested loop to two-pointer approach...'"
                  style={{
                    width: "100%",
                    minHeight: 70,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface-low, var(--surface))",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Difficulty Felt */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  How hard did this feel? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(1=easy, 5=brutal)</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setDifficultyFelt(n)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        border: `1px solid ${difficultyFelt === n ? "var(--primary)" : "var(--border)"}`,
                        background: difficultyFelt === n ? "var(--primary)" : "transparent",
                        color: difficultyFelt === n ? "#fff" : "var(--text-secondary)",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Next */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  Could you solve a similar problem now?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { val: "yes", label: "Yes", color: "var(--success)" },
                    { val: "maybe", label: "Maybe", color: "var(--warning)" },
                    { val: "no", label: "No", color: "var(--danger)" },
                  ] as const).map(({ val, label, color }) => (
                    <button
                      key={val}
                      onClick={() => setConfidenceNext(val)}
                      style={{
                        flex: 1,
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: `1px solid ${confidenceNext === val ? color : "var(--border)"}`,
                        background: confidenceNext === val ? `${color}15` : "transparent",
                        color: confidenceNext === val ? color : "var(--text-secondary)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>
                  {error}
                </div>
              )}

              <button
                className="n-btn-primary"
                onClick={submit}
                style={{ width: "100%", padding: "12px", fontSize: 14 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
                Submit &amp; Get AI Analysis (+30 XP)
              </button>
            </>
          )}

          {step === "submitting" && (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 40, color: "var(--primary)", animation: "spin 1.5s linear infinite", display: "block", marginBottom: 16 }}
              >
                neurology
              </span>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                Coach is analyzing your failure...
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Pattern detection + root cause analysis
              </div>
            </div>
          )}

          {step === "result" && (
            <>
              {/* XP Banner */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "var(--success-light, rgba(46,160,67,0.08))",
                  border: "1px solid var(--success)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success)" }}>
                  +{xpAwarded} XP earned for post-mortem reflection
                </span>
              </div>

              {/* AI Analysis */}
              {analysis ? (
                <div>
                  {/* Error Category Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 20, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}
                    >
                      neurology
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      Coach&apos;s Analysis
                    </span>
                    {analysis.errorCategory && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "3px 10px",
                          borderRadius: 6,
                          background: `${categoryColors[analysis.errorCategory] || "var(--text-muted)"}15`,
                          color: categoryColors[analysis.errorCategory] || "var(--text-muted)",
                        }}
                      >
                        {analysis.errorCategory}
                      </span>
                    )}
                  </div>

                  {/* Pattern */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      Pattern Detected
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
                      {analysis.pattern}
                    </div>
                  </div>

                  {/* Root Cause */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      Root Cause
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
                      {analysis.rootCause}
                    </div>
                  </div>

                  {/* Action Item */}
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "var(--primary-light, rgba(3,102,214,0.06))",
                      borderLeft: "3px solid var(--primary)",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      ⚡ Action Item
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
                      {analysis.actionItem}
                    </div>
                  </div>

                  {/* Next Problem Hint */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      🎯 What to Solve Next
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
                      {analysis.nextProblemHint}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
                  AI analysis unavailable — your post-mortem was still saved.
                </div>
              )}

              <button
                className="n-btn-secondary"
                onClick={onClose}
                style={{ width: "100%", padding: "10px", fontSize: 13 }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
