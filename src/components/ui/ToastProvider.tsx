"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useSeriousMode } from "@/hooks/useSeriousMode";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "xp" | "levelup";
  icon?: string;
  exiting?: boolean;
}

interface ToastContextType {
  addToast: (message: string, type: Toast["type"], icon?: string) => void;
  showXP: (amount: number) => void;
  showLevelUp: (level: number) => void;
  triggerConfetti: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confetti, setConfetti] = useState(false);
  const idCounter = useRef(0);
  // Serious mode tones down celebratory fanfare (confetti, "Level Up!" emoji).
  const serious = useSeriousMode();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast["type"], icon?: string) => {
      const id = `toast-${++idCounter.current}`;
      setToasts((prev) => [...prev, { id, message, type, icon }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const showXP = useCallback(
    (amount: number) => {
      addToast(`+${amount} XP earned!`, "xp", "star");
    },
    [addToast]
  );

  const showLevelUp = useCallback(
    (level: number) => {
      if (serious) {
        // Quiet, no confetti, no emoji fanfare.
        addToast(`Level ${level} reached`, "info", "trending_up");
        return;
      }
      addToast(`🎉 Level Up! You're now Level ${level}!`, "levelup", "military_tech");
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    },
    [addToast, serious]
  );

  const triggerConfetti = useCallback(() => {
    if (serious) return; // no celebratory confetti in serious mode
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3000);
  }, [serious]);

  const typeStyles: Record<string, { bg: string; border: string; color: string }> = {
    success: { bg: "var(--success-light)", border: "var(--success)", color: "var(--success)" },
    error: { bg: "var(--danger-light)", border: "var(--danger)", color: "var(--danger)" },
    info: { bg: "var(--primary-light)", border: "var(--primary)", color: "var(--primary)" },
    xp: { bg: "var(--warning-light)", border: "var(--warning)", color: "var(--warning)" },
    levelup: { bg: "var(--primary-light)", border: "var(--primary)", color: "var(--primary)" },
  };

  const typeIcons: Record<string, string> = {
    success: "check_circle",
    error: "error",
    info: "info",
    xp: "star",
    levelup: "military_tech",
  };

  const confettiColors = ["#f85149", "#58a6ff", "#3fb950", "#d29922", "#f778ba", "#a371f7"];

  return (
    <ToastContext.Provider value={{ addToast, showXP, showLevelUp, triggerConfetti }}>
      {children}

      {/* Confetti Layer */}
      {confetti && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, pointerEvents: "none", overflow: "hidden" }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${Math.random() * 100}%`,
                top: "-10px",
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                background: confettiColors[i % confettiColors.length],
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.5}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => {
          const style = typeStyles[toast.type] || typeStyles.info;
          return (
            <div
              key={toast.id}
              className={`toast-item ${toast.exiting ? "exiting" : ""}`}
              style={{ borderLeft: `4px solid ${style.border}` }}
              onClick={() => removeToast(toast.id)}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: toast.type === "levelup" ? 28 : 22,
                  color: style.color,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {toast.icon || typeIcons[toast.type]}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: toast.type === "levelup" ? 16 : 14,
                    fontWeight: toast.type === "levelup" ? 800 : 600,
                    color: toast.type === "levelup" ? style.color : "var(--text-primary)",
                  }}
                >
                  {toast.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
