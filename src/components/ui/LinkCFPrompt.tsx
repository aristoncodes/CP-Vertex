"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DISMISS_KEY = "cp-vertex:cfLinkDismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * A modal prompt that appears for users who haven't linked their
 * Codeforces profile. Dismissable for 24 hours. Links to /settings.
 */
export function LinkCFPrompt() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const elapsed = Date.now() - parseInt(dismissed, 10);
      if (elapsed < DISMISS_DURATION_MS) return;
    }

    // Check if user has CF handle linked
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.cfHandle) {
          // Small delay so it doesn't flash immediately on page load
          setTimeout(() => setVisible(true), 1200);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const handleGoToSettings = () => {
    setVisible(false);
    router.push("/settings");
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 9998,
          animation: "cfPromptFadeIn 0.3s ease",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "min(440px, 90vw)",
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "36px 32px 28px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "cfPromptSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 32, color: "white", fontVariationSettings: "'FILL' 1" }}
          >
            link
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            margin: "0 0 8px",
          }}
        >
          Link Your Codeforces Profile
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            margin: "0 0 24px",
            maxWidth: 340,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Connect your Codeforces account to unlock{" "}
          <strong style={{ color: "var(--text-primary)" }}>XP tracking</strong>,{" "}
          <strong style={{ color: "var(--text-primary)" }}>streaks</strong>,{" "}
          <strong style={{ color: "var(--text-primary)" }}>duels</strong>, and{" "}
          <strong style={{ color: "var(--text-primary)" }}>AI coaching</strong>.
          It only takes 30 seconds.
        </p>

        {/* Features list */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 24,
            textAlign: "left",
            padding: "0 12px",
          }}
        >
          {[
            { icon: "trending_up", text: "Auto-sync submissions & rating" },
            { icon: "local_fire_department", text: "Track daily solving streaks" },
            { icon: "swords", text: "Challenge friends to duels" },
          ].map((item) => (
            <div
              key={item.icon}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  color: "var(--primary)",
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {item.icon}
              </span>
              {item.text}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGoToSettings}
          className="n-btn-primary"
          style={{
            width: "100%",
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            settings
          </span>
          Go to Settings & Link Now
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 13,
            cursor: "pointer",
            padding: "8px 16px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Remind me later
        </button>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes cfPromptFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cfPromptSlideIn {
          from { opacity: 0; transform: translate(-50%, -46%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
}
