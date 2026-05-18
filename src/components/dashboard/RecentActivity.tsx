"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  id: string;
  type: "solve" | "duel_win" | "duel_loss" | "duel_draw" | "mission" | "badge";
  title: string;
  subtitle: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

const typeConfig: Record<
  ActivityItem["type"],
  { icon: string; color: string; bg: string; fill: boolean }
> = {
  solve: { icon: "check_circle", color: "#10b981", bg: "#10b98114", fill: true },
  duel_win: { icon: "emoji_events", color: "#f59e0b", bg: "#f59e0b14", fill: true },
  duel_loss: { icon: "close", color: "#ef4444", bg: "#ef444414", fill: false },
  duel_draw: { icon: "balance", color: "#6b7280", bg: "#6b728014", fill: false },
  mission: { icon: "flag", color: "#3b82f6", bg: "#3b82f614", fill: true },
  badge: { icon: "workspace_premium", color: "#a855f7", bg: "#a855f714", fill: true },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/activity/recent")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.activities)) setActivities(d.activities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = expanded ? activities : activities.slice(0, 5);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="n-section-label" style={{ margin: 0 }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}
          >
            history
          </span>
          Recent Activity
        </div>
        {activities.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: 6,
              fontFamily: "'Inter', sans-serif",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--primary-light)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            {expanded ? "Show less" : `View all (${activities.length})`}
          </button>
        )}
      </div>

      <div
        className="n-card"
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 24,
                color: "var(--text-faint)",
                animation: "spin 1s linear infinite",
              }}
            >
              progress_activity
            </span>
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, color: "var(--text-faint)", marginBottom: 8, display: "block" }}
            >
              inbox
            </span>
            <div style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>
              No recent activity yet
            </div>
            <div style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 4 }}>
              Solve problems, complete missions, or duel friends to see your feed here.
            </div>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {/* Timeline line */}
            <div
              style={{
                position: "absolute",
                left: 27,
                top: 28,
                bottom: 28,
                width: 2,
                background: "var(--border)",
                borderRadius: 1,
                zIndex: 0,
              }}
            />

            {visible.map((item, i) => {
              const cfg = typeConfig[item.type];
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                    padding: "14px 18px",
                    position: "relative",
                    zIndex: 1,
                    transition: "background 0.15s",
                    borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-high, rgba(0,0,0,0.02))")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Icon dot */}
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: cfg.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 1,
                      border: "2px solid var(--surface-card)",
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 12,
                        color: cfg.color,
                        fontVariationSettings: cfg.fill ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {cfg.icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.type === "badge" && item.meta?.emoji ? (
                        <span style={{ marginRight: 4 }}>{String(item.meta.emoji)}</span>
                      ) : null}
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{item.subtitle}</span>
                      {item.type === "solve" && item.meta?.xp ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#f59e0b",
                            background: "#f59e0b14",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          +{Number(item.meta.xp)} XP
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-faint)",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {timeAgo(item.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
