"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Step = "welcome" | "link-cf" | "pick-mode" | "done";

const ratingRanges = [
  { label: "Beginner", range: "800–1100", desc: "New to CP, learning basics", color: "var(--text-muted)" },
  { label: "Pupil", range: "1200–1400", desc: "Know fundamentals, building speed", color: "var(--success)" },
  { label: "Specialist", range: "1400–1600", desc: "Solid with standard techniques", color: "var(--info)" },
  { label: "Expert", range: "1600–1900", desc: "Strong problem-solving skills", color: "#7c3aed" },
  { label: "Candidate Master+", range: "1900+", desc: "Advanced algorithmic thinking", color: "#FF8C00" },
];

const modes = [
  { id: "blitz", name: "Blitz Mode", desc: "3–5 fast problems to warm up", icon: "bolt", color: "var(--warning)" },
  { id: "drill", name: "Drill", desc: "Target your weak topics", icon: "target", color: "var(--success)" },
  { id: "boss", name: "Boss Fight", desc: "One hard problem for maximum XP", icon: "local_fire_department", color: "var(--danger)" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState<Step>("welcome");
  const [handle, setHandle] = useState("");
  const [linking, setLinking] = useState(false);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [skippedCF, setSkippedCF] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Check if user already completed onboarding
  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("cp-vertex:onboarded");
      if (completed === "1") router.push("/dashboard");
    }
  }, [router]);

  const handleLinkCF = async () => {
    if (!handle || handle.length < 3) return;
    setLinking(true);
    try {
      const res = await fetch("/api/user/cf-handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      if (res.ok) {
        setStep("pick-mode");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to link handle");
      }
    } catch {
      alert("Connection failed.");
    } finally {
      setLinking(false);
    }
  };

  const finishOnboarding = () => {
    localStorage.setItem("cp-vertex:onboarded", "1");
    if (selectedMode === "boss") {
      router.push("/arena/boss");
    } else if (selectedMode) {
      router.push(`/train/session?mode=${selectedMode}`);
    } else {
      router.push("/dashboard");
    }
  };

  if (status === "loading") return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--surface)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ maxWidth: 580, width: "100%" }}>
        {/* Step indicator */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 40 }}>
          {["welcome", "link-cf", "pick-mode"].map((s, i) => (
            <div key={s} style={{
              width: 40, height: 4, borderRadius: 2,
              background: ["welcome", "link-cf", "pick-mode"].indexOf(step) >= i ? "var(--primary)" : "var(--surface-high)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* ─── Step 1: Welcome ─── */}
        {step === "welcome" && (
          <div className="onboarding-step" style={{ textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: "linear-gradient(135deg, var(--primary-hover), var(--primary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px", fontSize: 32, color: "white", fontWeight: 800,
            }}>CV</div>
            <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: 12 }}>
              Welcome to CP Vertex
            </h1>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 32, maxWidth: 440, margin: "0 auto 32px" }}>
              Let&apos;s set up your profile in under a minute so you can start earning XP and climbing the leaderboard.
            </p>
            <button className="n-btn-primary" style={{ padding: "14px 36px", fontSize: 16 }} onClick={() => setStep("link-cf")}>
              Let&apos;s Go
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          </div>
        )}

        {/* ─── Step 2: Link Codeforces ─── */}
        {step === "link-cf" && (
          <div className="onboarding-step">
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Link Your Codeforces Handle
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
              We&apos;ll import your solve history, rating, and submissions to personalize your experience.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <input
                className="n-input"
                placeholder="e.g. tourist"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                style={{ flex: 1, fontSize: 16, padding: 14 }}
              />
              <button className="n-btn-primary" style={{ padding: "14px 24px" }} onClick={handleLinkCF} disabled={linking}>
                {linking ? "Linking..." : "Link"}
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, textAlign: "center" }}>
                Don&apos;t have a Codeforces account? Select your estimated level:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ratingRanges.map((r) => (
                  <div
                    key={r.label}
                    className={`onboarding-option ${selectedRange === r.label ? "selected" : ""}`}
                    onClick={() => setSelectedRange(r.label)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{r.label}</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{r.desc}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.range}</span>
                  </div>
                ))}
              </div>

              {(selectedRange || skippedCF) ? null : (
                <button
                  style={{
                    display: "block", margin: "16px auto 0", padding: "10px 24px", fontSize: 13,
                    background: "transparent", border: "1px solid var(--border)", borderRadius: 8,
                    color: "var(--text-muted)", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  }}
                  onClick={() => { setSkippedCF(true); setStep("pick-mode"); }}
                >
                  Skip for now →
                </button>
              )}

              {selectedRange && (
                <button
                  className="n-btn-primary"
                  style={{ display: "block", margin: "16px auto 0", padding: "12px 32px" }}
                  onClick={() => setStep("pick-mode")}
                >
                  Continue
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 3: Pick First Mode ─── */}
        {step === "pick-mode" && (
          <div className="onboarding-step">
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Choose Your First Training
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 24 }}>
              Jump right in — you can always switch modes later.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {modes.map((m) => (
                <div
                  key={m.id}
                  className={`onboarding-option ${selectedMode === m.id ? "selected" : ""}`}
                  onClick={() => setSelectedMode(m.id)}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px" }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: `${m.color}12`, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: m.color, fontVariationSettings: "'FILL' 1" }}>
                      {m.icon}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{m.desc}</div>
                  </div>
                  {selectedMode === m.id && (
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button
                className="n-btn-secondary"
                style={{ padding: "12px 24px" }}
                onClick={() => {
                  localStorage.setItem("cp-vertex:onboarded", "1");
                  router.push("/dashboard");
                }}
              >
                Skip to Dashboard
              </button>
              {selectedMode && (
                <button className="n-btn-primary" style={{ padding: "12px 32px", fontSize: 15 }} onClick={finishOnboarding}>
                  Start Training
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
