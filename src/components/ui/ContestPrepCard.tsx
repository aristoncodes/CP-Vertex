"use client";
import { useState } from "react";

interface ContestPrep {
  riskAreas: string[];
  strengths: string[];
  warmupTags: { tag: string; rating: number }[];
  strategy: string[];
  timeAllocation: Record<string, string>;
}

export function ContestPrepCard() {
  const [prep, setPrep] = useState<ContestPrep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contests/prep", { method: "POST" });
      const data = await res.json();
      if (data.prep) {
        setPrep(data.prep);
      } else {
        setError(data.error || "Failed to generate prep");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!prep) {
    return (
      <div
        className="n-card"
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, color: "var(--accent, var(--primary))", fontVariationSettings: "'FILL' 1" }}
            >
              neurology
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              AI Contest Prep
            </span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Get personalized strategy, warm-up suggestions, and time allocation
          </p>
          {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: "4px 0 0" }}>{error}</p>}
        </div>
        <button
          className="n-btn-primary"
          onClick={generate}
          disabled={loading}
          style={{ padding: "8px 20px", fontSize: 13, whiteSpace: "nowrap" }}
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14, animation: "spin 1s linear infinite" }}>sync</span>
              Analyzing...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
              Prep Me
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className="n-card"
      style={{
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          background: "linear-gradient(135deg, var(--primary), var(--accent, var(--primary)))",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#fff", fontVariationSettings: "'FILL' 1" }}>
          neurology
        </span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>AI Contest Prep</span>
        <button
          onClick={() => setPrep(null)}
          style={{
            marginLeft: "auto",
            background: "rgba(255,255,255,0.15)",
            border: "none",
            borderRadius: 6,
            padding: "4px 10px",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Regenerate
        </button>
      </div>

      <div style={{ padding: "16px 24px" }}>
        {/* Risk Areas + Strengths row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
              ⚠ Risk Areas
            </div>
            {prep.riskAreas.map((r, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0", display: "flex", gap: 6 }}>
                <span style={{ color: "var(--danger)" }}>•</span>{r}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
              ✓ Strengths
            </div>
            {prep.strengths.map((s, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0", display: "flex", gap: 6 }}>
                <span style={{ color: "var(--success)" }}>•</span>{s}
              </div>
            ))}
          </div>
        </div>

        {/* Warm-up tags */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            🔥 Warm Up Before Contest
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {prep.warmupTags.map((w, i) => (
              <span
                key={i}
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 8,
                  background: "var(--surface-high, var(--surface-low))",
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                }}
              >
                {w.tag} · ~{w.rating}
              </span>
            ))}
          </div>
        </div>

        {/* Strategy */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
            📋 Strategy
          </div>
          {prep.strategy.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "3px 0", lineHeight: 1.6, display: "flex", gap: 6 }}>
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>{i + 1}.</span>{s}
            </div>
          ))}
        </div>

        {/* Time Allocation */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            ⏱ Time Allocation
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(prep.timeAllocation).map(([problem, time]) => (
              <div
                key={problem}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: "var(--surface-high, var(--surface-low))",
                  border: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{problem}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
