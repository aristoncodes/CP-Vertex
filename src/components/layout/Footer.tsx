"use client";

import { useEffect, useState } from "react";

export function Footer() {
  const [visits, setVisits] = useState<number | null>(null);

  useEffect(() => {
    async function fetchVisits() {
      try {
        const res = await fetch("/api/visits");
        if (res.ok) {
          const data = await res.json();
          setVisits(data.visits);
        }
      } catch (error) {
        console.error("Failed to fetch visits", error);
      }
    }
    fetchVisits();
  }, []);

  return (
    <footer style={{
      padding: "32px 0",
      borderTop: "1px solid var(--border)",
      textAlign: "center",
      fontFamily: "'Inter', sans-serif",
      color: "var(--text-muted)",
      fontSize: "13px",
      marginTop: "auto",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: "32px", 
          marginBottom: "16px",
          fontWeight: 500
        }}>
          <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>CodeArena © {new Date().getFullYear()}</a>
          <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Rules</a>
          <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>About</a>
          <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Privacy</a>
          <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>API</a>
        </div>
        <div style={{ marginBottom: "8px" }}>
          The only platform you need for algorithmic mastery.
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
          Total Visits: <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{visits !== null ? visits.toLocaleString() : "---"}</span>
        </div>
      </div>
    </footer>
  );
}
