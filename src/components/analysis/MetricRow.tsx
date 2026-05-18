"use client";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

interface MetricCardProps {
  label: string; value: string | number; delta: number;
  icon: string; color: string; loading?: boolean;
  invertDelta?: boolean;
}

function MetricCard({ label, value, delta, icon, color, loading, invertDelta }: MetricCardProps) {
  if (loading) return (
    <div style={{ background: "var(--surface-low)", borderRadius: 8, padding: "16px 20px" }}>
      <Skeleton width="60%" height={12} />
      <div style={{ marginTop: 10 }}><Skeleton width="50%" height={22} /></div>
      <div style={{ marginTop: 8 }}><Skeleton width="40%" height={12} /></div>
    </div>
  );

  const isPositive = invertDelta ? delta <= 0 : delta >= 0;
  const deltaColor = delta === 0 ? "var(--text-muted)" : isPositive ? "#3B6D11" : "#A32D2D";
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <div style={{
      background: "var(--surface-low)", borderRadius: 8, padding: "16px 20px",
      transition: "transform 0.15s, box-shadow 0.15s",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 400, color: deltaColor, marginTop: 6, display: "flex", alignItems: "center", gap: 3 }}>
        <span>{arrow}</span>
        <span>{Math.abs(delta)}{typeof value === "string" && value.includes("%") ? "%" : ""} vs last period</span>
      </div>
    </div>
  );
}

interface MetricRowProps {
  rating: number; ratingDelta: number;
  solveRate: number; solveRateDelta: number;
  avgPenalty: number; avgPenaltyDelta: number;
  upsolveBacklog: number; upsolveBacklogDelta: number;
  loading: boolean;
}

export function MetricRow(props: MetricRowProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }} className="stats-grid-4">
      <MetricCard label="Current Rating" value={props.loading ? "—" : props.rating} delta={props.ratingDelta} icon="trending_up" color="#5B4FD4" loading={props.loading} />
      <MetricCard label="Solve Rate (60d)" value={props.loading ? "—" : `${props.solveRate}%`} delta={props.solveRateDelta} icon="check_circle" color="#3B6D11" loading={props.loading} />
      <MetricCard label="Avg Penalty" value={props.loading ? "—" : `${props.avgPenalty} min`} delta={props.avgPenaltyDelta} icon="timer" color="#BA7517" loading={props.loading} invertDelta />
      <MetricCard label="Upsolve Backlog" value={props.loading ? "—" : props.upsolveBacklog} delta={props.upsolveBacklogDelta} icon="assignment_late" color="#A32D2D" loading={props.loading} invertDelta />
    </div>
  );
}
