"use client";

import { useState } from "react";

export function InfoTooltip({ info, align = "center" }: { info: string; align?: "center" | "right" | "left" }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 6 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 14, color: "var(--text-faint)", cursor: "help" }}
      >
        info
      </span>
      {showTooltip && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          ...(align === "center" ? { left: "50%", transform: "translateX(-50%)" } : {}),
          ...(align === "right" ? { right: 0 } : {}),
          ...(align === "left" ? { left: 0 } : {}),
          background: "var(--surface-high)",
          color: "var(--text-primary)",
          padding: "10px 14px",
          borderRadius: "8px",
          fontSize: "12px",
          lineHeight: "1.5",
          whiteSpace: "normal",
          width: "max-content",
          maxWidth: "250px",
          boxShadow: "0 12px 24px rgba(0,0,0,0.3)",
          border: "1px solid var(--border)",
          pointerEvents: "none",
          zIndex: 100,
          fontWeight: 400,
          textTransform: "none",
          letterSpacing: "normal"
        }}>
          {info}
        </div>
      )}
    </div>
  );
}
