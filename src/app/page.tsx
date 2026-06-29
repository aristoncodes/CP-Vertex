"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const features = [
  {
    icon: "fitness_center",
    title: "4 Training Modes",
    desc: "Blitz for speed, Drill for weakness targeting, Boss Fight for XP, and Warmup to get in the zone.",
    color: "#0366d6",
  },
  {
    icon: "smart_toy",
    title: "AI Tactical Coach",
    desc: "Gemini-powered analysis identifies your blind spots and recommends what to train next.",
    color: "#7c3aed",
  },
  {
    icon: "swords",
    title: "Real-Time Duels",
    desc: "Challenge friends to head-to-head problem-solving battles with live spectator mode.",
    color: "#dc2626",
  },
  {
    icon: "timeline",
    title: "Deep Analytics",
    desc: "Topic-level skill scores, rating history, heatmaps, and trend tracking — all from your CF data.",
    color: "#059669",
  },
  {
    icon: "history",
    title: "Upsolve Tracker",
    desc: "Automatically track contest problems you didn't solve and revisit them for maximum learning.",
    color: "#d97706",
  },
  {
    icon: "menu_book",
    title: "162+ Algorithm Guides",
    desc: "Full CP-Algorithms database with LaTeX rendering, built right into the platform.",
    color: "#0891b2",
  },
];

const comparisonRows = [
  { feature: "Gamification (XP, Levels, Badges)", vertex: true, cf: false, tle: false },
  { feature: "AI-Powered Coaching", vertex: true, cf: false, tle: true },
  { feature: "Real-Time Duels", vertex: true, cf: false, tle: false },
  { feature: "Upsolve Tracking", vertex: true, cf: false, tle: true },
  { feature: "Algorithm Database", vertex: true, cf: false, tle: false },
  { feature: "Topic-Level Analytics", vertex: true, cf: false, tle: true },
  { feature: "Free & Open", vertex: true, cf: true, tle: false },
];

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [handleInput, setHandleInput] = useState("");
  const { data: session, status } = useSession();

  const analyzeHandle = (e: React.FormEvent) => {
    e.preventDefault();
    const h = handleInput.trim();
    if (h) router.push(`/u/${encodeURIComponent(h)}`);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--surface, linear-gradient(135deg, #f7fafe 0%, #e8f0fe 50%, #f1f4f8 100%))",
      display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: 1200, margin: "0 auto", width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #004fa8, #0366d6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 14, fontWeight: 800,
          }}>CV</div>
          <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary, #181c1f)", letterSpacing: "-0.03em" }}>
            CP <span style={{ color: "#0366d6" }}>Vertex</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push("/login")} style={{
            padding: "10px 24px", background: "transparent",
            border: "1px solid var(--border, rgba(194,198,214,0.4))", borderRadius: 10,
            fontSize: 14, fontWeight: 600, color: "var(--text-secondary, #424753)",
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
          }}>Sign In</button>
          <button onClick={() => router.push("/login")} className="n-btn-primary" style={{ padding: "10px 24px" }}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 32px", textAlign: "center",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.8s ease, transform 0.8s ease",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px", background: "rgba(3, 102, 214, 0.08)",
          border: "1px solid rgba(3, 102, 214, 0.15)", borderRadius: 20,
          marginBottom: 32, marginTop: 60, fontSize: 13, fontWeight: 600, color: "#0366d6",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          Competitive Programming Reimagined
        </div>

        <h1 style={{
          fontSize: "clamp(48px, 8vw, 80px)", fontWeight: 900, lineHeight: 1.05,
          letterSpacing: "-0.04em", color: "var(--text-primary, #181c1f)", maxWidth: 700, margin: "0 auto",
        }}>
          Train. Compete.{" "}
          <span style={{
            background: "linear-gradient(135deg, #004fa8, #0366d6, #60a5fa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Master.</span>
        </h1>

        <p style={{
          fontSize: 18, lineHeight: 1.6, color: "var(--text-secondary, #424753)",
          maxWidth: 560, margin: "20px auto 0",
        }}>
          A gamified platform that turns competitive programming into a tactical
          journey. Solve problems, earn XP, climb ranks, and compete against the best.
        </p>

        {/* Instant-value: analyze any Codeforces handle, no login */}
        <form onSubmit={analyzeHandle} className="hero-analyze" style={{
          display: "flex", gap: 10, marginTop: 40, width: "100%", maxWidth: 480,
        }}>
          <input
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            placeholder="Analyze any Codeforces handle — e.g. tourist"
            aria-label="Codeforces handle"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1, minWidth: 0, padding: "14px 18px", fontSize: 15,
              borderRadius: 10, border: "1px solid var(--border, rgba(194,198,214,0.4))",
              background: "var(--surface-card, #fff)", color: "var(--text-primary, #181c1f)",
              fontFamily: "'Inter', sans-serif", outline: "none",
            }}
          />
          <button type="submit" className="n-btn-primary" style={{ padding: "14px 28px", fontSize: 15, whiteSpace: "nowrap" }}>
            Analyze
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>
        </form>
        <p style={{ fontSize: 13, color: "var(--text-muted, #727785)", marginTop: 12 }}>
          No sign-up required. Instant topic-strength, rating, and contest analysis.
        </p>

        <div className="hero-cta" style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button onClick={() => router.push("/login")} className="n-btn-primary" style={{ padding: "14px 32px", fontSize: 15 }}>
            Enter the Arena
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
          </button>
          <button onClick={() => router.push("/learn")} className="n-btn-secondary" style={{ padding: "14px 32px", fontSize: 15 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>menu_book</span>
            Library
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 48, marginTop: 80, opacity: mounted ? 1 : 0, transition: "opacity 1s ease 0.5s" }}>
          {[
            { value: "162+", label: "Articles", icon: "description" },
            { value: "5", label: "Game Modes", icon: "sports_esports" },
            { value: "AI", label: "Tactical Coach", icon: "smart_toy" },
            { value: "∞", label: "Problems", icon: "code" },
          ].map((stat) => (
            <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#0366d6", fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
              <strong style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--text-primary, #181c1f)", letterSpacing: "-0.02em" }}>{stat.value}</strong>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #727785)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Features Grid (#7) */}
      <section style={{ maxWidth: 1200, margin: "80px auto 0", padding: "0 32px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: "var(--text-primary, #181c1f)", letterSpacing: "-0.03em" }}>
            Everything You Need to <span style={{ color: "#0366d6" }}>Level Up</span>
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-muted, #727785)", marginTop: 12, maxWidth: 500, margin: "12px auto 0" }}>
            Not just another problem tracker. A complete training ecosystem.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} style={{
              padding: "28px 24px", background: "var(--surface-card, white)",
              border: "1px solid var(--border, rgba(194,198,214,0.3))", borderRadius: 16,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${f.color}12`, display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: f.color, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #181c1f)", marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted, #727785)", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table (#7) */}
      <section style={{ maxWidth: 800, margin: "80px auto 0", padding: "0 32px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary, #181c1f)", letterSpacing: "-0.02em" }}>
            How We Compare
          </h2>
        </div>
        <div style={{
          border: "1px solid var(--border, rgba(194,198,214,0.3))", borderRadius: 16,
          overflow: "hidden", background: "var(--surface-card, white)",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border, rgba(194,198,214,0.3))" }}>
                <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "var(--text-muted, #727785)" }}>Feature</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#0366d6" }}>CP Vertex</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--text-muted, #727785)" }}>Codeforces</th>
                <th style={{ padding: "14px 16px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "var(--text-muted, #727785)" }}>Others</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: i < comparisonRows.length - 1 ? "1px solid var(--border, rgba(194,198,214,0.15))" : "none" }}>
                  <td style={{ padding: "12px 20px", fontSize: 14, fontWeight: 500, color: "var(--text-primary, #181c1f)" }}>{row.feature}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#059669", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: row.cf ? "#059669" : "var(--text-faint, #c2c6d6)", fontVariationSettings: "'FILL' 1" }}>
                      {row.cf ? "check_circle" : "cancel"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: row.tle ? "#059669" : "var(--text-faint, #c2c6d6)", fontVariationSettings: "'FILL' 1" }}>
                      {row.tle ? "check_circle" : "cancel"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        maxWidth: 1200, margin: "80px auto 0", padding: "0 32px", width: "100%",
      }}>
        <div style={{
          padding: "48px 40px", borderRadius: 20,
          background: "linear-gradient(135deg, #004fa8, #0366d6, #3b82f6)",
          textAlign: "center", color: "white",
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 12 }}>
            Ready to Start Your Climb?
          </h2>
          <p style={{ fontSize: 16, opacity: 0.9, maxWidth: 500, margin: "0 auto 28px", lineHeight: 1.5 }}>
            Join CP Vertex today and turn every problem you solve into progress you can see.
          </p>
          <button onClick={() => router.push("/login")} style={{
            padding: "14px 36px", fontSize: 16, fontWeight: 700,
            background: "white", color: "#0366d6", border: "none", borderRadius: 12,
            cursor: "pointer", fontFamily: "'Inter', sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}>
            Create Free Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "48px 32px 24px", textAlign: "center", fontSize: 12, color: "var(--text-muted, #727785)" }}>
        © 2026 CP Vertex · Built for competitive programmers
      </footer>
    </div>
  );
}
