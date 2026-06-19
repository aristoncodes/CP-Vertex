"use client";
import { useState } from "react";

interface Hint {
  hintLevel: number;
  hintText: string;
  xpCost: number;
}

const XP_COSTS = [0, 10, 25, 50];
const LEVEL_LABELS = ["Conceptual", "Technique", "Approach", "Full Solution"];
const LEVEL_ICONS = ["lightbulb", "psychology", "route", "code"];

export function HintButton({ problemId }: { problemId: string }) {
  const [hints, setHints] = useState<Hint[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");

  const nextLevel = hints.length > 0 ? Math.min(4, hints[hints.length - 1].hintLevel + 1) : 1;
  const allUnlocked = hints.length >= 4;

  const fetchExisting = async () => {
    try {
      const res = await fetch(`/api/hints?problemId=${problemId}`);
      const data = await res.json();
      if (data.hints?.length > 0) setHints(data.hints);
    } catch { /* ignore */ }
  };

  const requestHint = async () => {
    if (allUnlocked) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemId, level: nextLevel }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setHints((prev) => [...prev, { hintLevel: data.level, hintText: data.hint, xpCost: data.xpCost }]);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!expanded && hints.length === 0) {
      await fetchExisting();
    }
    setExpanded(!expanded);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button
        onClick={handleToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          background: expanded ? "var(--surface-high)" : "transparent",
          border: "1px solid var(--border)",
          borderRadius: 8,
          color: "var(--accent, var(--primary))",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {expanded ? "expand_less" : "auto_awesome"}
        </span>
        {expanded ? "Hide Hints" : "AI Hints"}
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 8,
            padding: "12px 14px",
            background: "var(--surface-low, var(--surface-card))",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
        >
          {/* Unlocked hints */}
          {hints.map((h) => (
            <div
              key={h.hintLevel}
              style={{
                padding: "10px 12px",
                marginBottom: 8,
                background: "var(--surface-card, var(--surface))",
                border: "1px solid var(--border)",
                borderRadius: 8,
                borderLeft: `3px solid var(--primary)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--primary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {LEVEL_ICONS[h.hintLevel - 1]}
                </span>
                Level {h.hintLevel} — {LEVEL_LABELS[h.hintLevel - 1]}
                {h.xpCost > 0 && (
                  <span style={{ color: "var(--warning)", fontWeight: 500, fontSize: 10, marginLeft: "auto" }}>
                    -{h.xpCost} XP
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {h.hintText}
              </div>
            </div>
          ))}

          {/* Request next hint */}
          {!allUnlocked && (
            <button
              onClick={requestHint}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "1px dashed var(--border-strong, var(--border))",
                borderRadius: 8,
                color: loading ? "var(--text-muted)" : "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {loading ? "hourglass_top" : LEVEL_ICONS[nextLevel - 1]}
              </span>
              {loading
                ? "Generating..."
                : `Unlock Level ${nextLevel} — ${LEVEL_LABELS[nextLevel - 1]} ${
                    XP_COSTS[nextLevel - 1] > 0 ? `(${XP_COSTS[nextLevel - 1]} XP)` : "(Free)"
                  }`}
            </button>
          )}

          {allUnlocked && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: 4 }}>
              All hints unlocked
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6, textAlign: "center" }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
