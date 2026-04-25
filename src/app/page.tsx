"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Don't flash the landing page if we are going to redirect
  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f7fafe 0%, #e8f0fe 50%, #f1f4f8 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #004fa8, #0366d6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            CV
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#181c1f", letterSpacing: "-0.03em" }}>
            CP <span style={{ color: "#0366d6" }}>Vertex</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "10px 24px",
              background: "transparent",
              border: "1px solid rgba(194,198,214,0.4)",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              color: "#424753",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/login")}
            className="n-btn-primary"
            style={{ padding: "10px 24px" }}
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          textAlign: "center",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            background: "rgba(3, 102, 214, 0.08)",
            border: "1px solid rgba(3, 102, 214, 0.15)",
            borderRadius: 20,
            marginBottom: 32,
            fontSize: 13,
            fontWeight: 600,
            color: "#0366d6",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
            rocket_launch
          </span>
          Competitive Programming Reimagined
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 80px)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#181c1f",
            maxWidth: 700,
            margin: "0 auto",
          }}
        >
          Train. Compete.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #004fa8, #0366d6, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Master.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color: "#424753",
            maxWidth: 560,
            margin: "20px auto 0",
          }}
        >
          A gamified platform that turns competitive programming into a tactical
          journey. Solve problems, earn XP, climb ranks, and compete against the best.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          <button
            onClick={() => router.push("/login")}
            className="n-btn-primary"
            style={{ padding: "14px 32px", fontSize: 15 }}
          >
            Enter the Arena
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>
          <button
            onClick={() => router.push("/learn")}
            className="n-btn-secondary"
            style={{ padding: "14px 32px", fontSize: 15 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>menu_book</span>
            Intel Database
          </button>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 80,
            opacity: mounted ? 1 : 0,
            transition: "opacity 1s ease 0.5s",
          }}
        >
          {[
            { value: "162+", label: "Articles", icon: "description" },
            { value: "5", label: "Game Modes", icon: "sports_esports" },
            { value: "AI", label: "Tactical Coach", icon: "smart_toy" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 28, color: "#0366d6", fontVariationSettings: "'FILL' 1" }}
              >
                {stat.icon}
              </span>
              <strong
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#181c1f",
                  letterSpacing: "-0.02em",
                }}
              >
                {stat.value}
              </strong>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#727785",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "24px 32px",
          textAlign: "center",
          fontSize: 12,
          color: "#727785",
        }}
      >
        © 2026 CP Vertex · Built for competitive programmers
      </footer>
    </div>
  );
}
