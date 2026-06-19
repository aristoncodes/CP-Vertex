"use client";
import { useState } from "react";

interface EditorialSummary {
  trick: string;
  keyTakeaway: string;
  whenToUse: string;
  complexity: string;
  commonMistakes: string[];
  prerequisites: string[];
  difficulty: string;
}

export function AISummaryCard({
  slug,
  title,
  contentPreview,
}: {
  slug: string;
  title: string;
  contentPreview: string;
}) {
  const [summary, setSummary] = useState<EditorialSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateSummary = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/intel/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, title, content: contentPreview }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setError(data.error || "Failed to generate summary");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors: Record<string, string> = {
    beginner: "var(--success)",
    intermediate: "var(--warning)",
    advanced: "var(--danger)",
  };

  if (!summary) {
    return (
      <button
        onClick={generateSummary}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "14px 20px",
          marginBottom: 24,
          background: "var(--surface-low)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 12,
          color: loading ? "var(--text-muted)" : "var(--accent)",
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          transition: "all 0.2s",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          {loading ? "hourglass_top" : "auto_awesome"}
        </span>
        {loading ? "Coach is analyzing..." : "✦ AI Coach Summary"}
        {error && (
          <span style={{ color: "var(--danger)", fontWeight: 400, marginLeft: "auto" }}>
            {error}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        marginBottom: 24,
        padding: 0,
        background: "var(--surface-low)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          padding: "12px 20px",
          background: "linear-gradient(135deg, rgba(3,102,214,0.08), rgba(3,102,214,0.03))",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 18, color: "var(--accent)" }}
          >
            auto_awesome
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
            Coach&apos;s Analysis
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: 6,
            background: `${difficultyColors[summary.difficulty] || "var(--text-muted)"}22`,
            color: difficultyColors[summary.difficulty] || "var(--text-muted)",
            textTransform: "capitalize",
          }}
        >
          {summary.difficulty}
        </span>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* The Trick — hero section */}
        {summary.trick && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "var(--primary-light, rgba(3,102,214,0.06))",
              borderRadius: 10,
              borderLeft: "3px solid var(--primary)",
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              ⚡ The Trick
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.5 }}>
              {summary.trick}
            </div>
          </div>
        )}

        {/* Key Takeaway */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Key Takeaway
          </div>
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>
            {summary.keyTakeaway}
          </div>
        </div>

        {/* When to Use + Complexity — side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--success)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              When to Use
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {summary.whenToUse}
            </div>
          </div>
          {summary.complexity && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--info, var(--primary))", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Complexity
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, fontFamily: "'Fira Code', 'JetBrains Mono', monospace" }}>
                {summary.complexity}
              </div>
            </div>
          )}
        </div>

        {/* Common Mistakes */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--danger)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ⚠ Common Mistakes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {summary.commonMistakes.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: "var(--danger)", fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>•</span>
                {m}
              </div>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Prerequisites
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {summary.prerequisites.map((p, i) => (
              <span
                key={i}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: "var(--surface-high)",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
