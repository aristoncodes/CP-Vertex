"use client";

export function RatingChart() {
  // Simplified mock data — just show a visual representation
  const points = [1200, 1280, 1350, 1310, 1400, 1420, 1380, 1450, 1500, 1480, 1550, 1520];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  return (
    <div className="n-card" style={{ padding: "18px 22px" }}>
      <div className="n-section-label">Rating History</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, paddingTop: 8 }}>
        {points.map((p, i) => {
          const pct = ((p - min) / range) * 100;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(8, pct)}%`,
                  background: `linear-gradient(180deg, var(--primary), rgba(3,102,214,0.3))`,
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.6s ease",
                  minHeight: 8,
                }}
                title={`Rating: ${p}`}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>12 months ago</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Now</span>
      </div>
    </div>
  );
}
