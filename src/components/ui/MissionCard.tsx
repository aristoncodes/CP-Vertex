"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

interface Mission {
  id: string;
  label: string;
  type: string;
  xp: number;
  done: boolean;
}

export function MissionCard({ mission, onComplete }: { mission: Mission; onComplete: () => void }) {
  const router = useRouter();
  const { activeMissionId, setActiveMission } = useStore();

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 18px",
      background: mission.done ? "var(--success-light)" : "var(--surface-card)",
      border: `1px solid ${mission.done ? "rgba(5,150,105,0.2)" : "var(--border)"}`,
      borderRadius: 12,
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 20,
          color: mission.done ? "var(--success)" : "var(--text-muted)",
          fontVariationSettings: mission.done ? "'FILL' 1" : "'FILL' 0",
        }}>
          {mission.done ? "check_circle" : "radio_button_unchecked"}
        </span>
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: mission.done ? "var(--success)" : "var(--text-primary)",
            textDecoration: mission.done ? "line-through" : "none",
          }}>
            {mission.label}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{mission.type}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ 
          fontSize: 12, 
          fontWeight: 700, 
          color: mission.done ? "var(--success)" : "var(--warning)",
          opacity: mission.done ? 0.8 : 1,
          textDecoration: mission.done ? "line-through" : "none"
        }}>
          +{mission.xp} XP
        </span>
        {!mission.done && (
          <button 
            className="n-btn-primary" 
            style={{ padding: "4px 12px", fontSize: 12 }} 
            onClick={() => {
              if (activeMissionId === mission.id) {
                onComplete();
              } else {
                setActiveMission(mission.id);
                if (mission.label.toLowerCase().includes("boss")) {
                  router.push('/arena/boss');
                } else if (mission.label.toLowerCase().includes("duel")) {
                  router.push('/arena');
                } else if (mission.label.toLowerCase().includes("post-mortem")) {
                  router.push('/problems');
                } else {
                  router.push('/problems');
                }
              }
            }}
          >
            {activeMissionId === mission.id ? "Verify" : "Start"}
          </button>
        )}
      </div>
    </div>
  );
}
