"use client";

import { useState } from "react";

/**
 * Fenced code block with a copy-to-clipboard button.
 *
 * Rendered from the article page's react-markdown `pre` override. In
 * react-markdown v9 block code arrives via `pre` (the `inline` prop on `code`
 * was removed), so the page hands us the extracted code text + language here.
 */
export function CodeBlock({
  code,
  lang,
  langLabel,
}: {
  code: string;
  lang: string;
  langLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  const CopyButton = (
    <button
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy code"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: 7,
        padding: "3px 9px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        color: copied ? "var(--rating-pupil)" : "var(--text-muted)",
        cursor: "pointer",
        fontFamily: "'SF Mono', monospace",
        transition: "color 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        {copied ? "check" : "content_copy"}
      </span>
      {copied ? "Copied" : "Copy"}
    </button>
  );

  return (
    <div
      style={{
        margin: "28px 0",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          background: "var(--surface-high)",
          padding: "8px 12px 8px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontFamily: "'SF Mono', monospace",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>code</span>
          {langLabel || "Code"}
        </span>
        {CopyButton}
      </div>
      <pre
        style={{
          background: "var(--surface-low)",
          padding: "20px 24px",
          overflowX: "auto",
          margin: 0,
        }}
      >
        <code
          className={lang ? `language-${lang}` : undefined}
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace",
            fontSize: 14,
            color: "var(--text-primary)",
            lineHeight: 1.6,
          }}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
