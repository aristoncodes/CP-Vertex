"use client";

function Skeleton({ width, height }: { width: string | number; height: string | number }) {
  return <div className="n-skeleton" style={{ width, height, minHeight: height }} />;
}

interface SystemStatus {
  judgeQueue: number; throughput: number; apiUp: boolean; degraded: boolean;
}

function StatusRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: dot === "green" ? "#3B6D11" : "#BA7517",
        boxShadow: dot === "green" ? "0 0 6px rgba(59,109,17,0.4)" : "0 0 6px rgba(186,117,23,0.4)",
      }} />
      <span style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

interface Props {
  status: SystemStatus;
  loading: boolean;
}

export function SystemHealth({ status, loading }: Props) {
  if (loading) return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>System Health</h2>
      <div style={{ maxWidth: 400 }} className="n-card"><div style={{ padding: "20px 24px" }}><Skeleton width="100%" height={100} /></div></div>
    </div>
  );

  const throughputDot = status.throughput >= 90 ? "green" : "amber";
  const apiDot = status.apiUp ? "green" : "amber";
  const queueDot = status.judgeQueue < 2000 ? "green" : "amber";

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--text-primary)", marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 8, color: "#5B4FD4", fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
        System Health
      </h2>
      <div className="n-card" style={{ padding: "20px 24px", maxWidth: 400 }}>
        <StatusRow dot={queueDot} label="Judge Queue" value={`${status.judgeQueue}ms`} />
        <StatusRow dot={throughputDot} label="Throughput" value={`${status.throughput}%`} />
        <StatusRow dot={apiDot} label="API Availability" value={status.apiUp ? "Online" : "Offline"} />

        {status.degraded && (
          <div style={{
            background: "#FAEEDA", border: "0.5px solid rgba(186,117,23,0.25)",
            borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8,
            alignItems: "center", marginTop: 12,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#BA7517", fontVariationSettings: "'FILL' 1" }}>warning</span>
            <span style={{ fontSize: 12, color: "#BA7517" }}>Throughput degraded. Expect minor delays during peak hours.</span>
          </div>
        )}
      </div>
    </div>
  );
}
