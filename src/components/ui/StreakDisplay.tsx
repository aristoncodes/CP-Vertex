"use client";

export function StreakDisplay({ count }: { count: number }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--surface-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "10px 16px",
    }}>
      <span style={{ fontSize: 20 }}>🔥</span>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--warning)", letterSpacing: "-0.02em" }}>{count}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Day streak</div>
      </div>
    </div>
  );
}
