"use client";

import { useRouter } from "next/navigation";

const quickActions = [
  { label: "Random Problem", icon: "casino", route: "/problems", color: "var(--primary)" },
  { label: "Boss Fight", icon: "local_fire_department", route: "/arena/boss", color: "var(--danger)" },
  { label: "Blitz Mode", icon: "bolt", route: "/practice/session?mode=blitz", color: "var(--warning)" },
  { label: "Intel Database", icon: "menu_book", route: "/learn", color: "var(--success)" },
];

export function MissionMap() {
  const router = useRouter();

  return (
    <div className="n-card" style={{ padding: "18px 22px" }}>
      <div className="n-section-label">Quick Actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.route)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              background: "var(--surface-low)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-secondary)",
              transition: "border-color 0.15s, background 0.15s",
              textAlign: "left",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: action.color, fontVariationSettings: "'FILL' 1" }}>
              {action.icon}
            </span>
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
