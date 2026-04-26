"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BossProblem {
  id: string;
  cfId: string;
  cfLink: string;
  title: string;
  rating: number;
  tags: string[];
}

type BossState = "idle" | "engaged" | "verifying" | "defeated" | "failed";

export default function BossFightPage() {
  const router = useRouter();
  const [boss, setBoss] = useState<BossProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [bossState, setBossState] = useState<BossState>("idle");
  const [verifyMessage, setVerifyMessage] = useState("");

  useEffect(() => {
    fetch("/api/problems/boss")
      .then(r => r.json())
      .then(d => { if (d.id) setBoss(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleEngage = async () => {
    if (!boss) return;
    // Always open the link
    window.open(boss.cfLink, "_blank");
    if (bossState === "idle") {
      setBossState("engaged");
      try {
        await fetch("/api/missions/boss/engage", { method: "POST" });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleVerify = async () => {
    if (!boss) return;
    setBossState("verifying");
    setVerifyMessage("");
    try {
      const res = await fetch(`/api/missions/boss/verify?cfId=${boss.cfId}`);
      const data = await res.json();
      if (data.solved) {
        setBossState("defeated");
        setVerifyMessage("🎉 Boss defeated! +" + (data.xpAwarded || 500) + " XP earned!");
      } else {
        setBossState("engaged");
        setVerifyMessage(data.message || "Not solved yet. Keep fighting!");
      }
    } catch (e) {
      console.error(e);
      setBossState("engaged");
      setVerifyMessage("Verification failed. Try again.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>Locating boss target...</div>
      </DashboardLayout>
    );
  }

  if (!boss) {
    return (
      <DashboardLayout>
        <div style={{ padding: 48, textAlign: "center", color: "var(--danger)", fontSize: 15 }}>
          No boss target found. You&apos;ve defeated all elites, or the database is empty.
        </div>
      </DashboardLayout>
    );
  }

  const stateLabel: Record<BossState, string> = {
    idle: "Engage Boss →",
    engaged: "Open Problem ↗",
    verifying: "Verifying...",
    defeated: "✓ Boss Defeated",
    failed: "Engage Boss →",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: bossState === "defeated"
        ? "linear-gradient(135deg, #f0fdf4 0%, #f7fafe 50%, #f0fdf4 100%)"
        : "linear-gradient(135deg, #fef2f2 0%, #f7fafe 50%, #fef2f2 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: 32,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: bossState === "defeated" ? "var(--success)" : "var(--danger)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
        {bossState === "defeated" ? "✓ Threat Eliminated" : "⚠ High-Level Threat Detected"}
      </div>

      <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: "var(--text-primary)", textAlign: "center", letterSpacing: "-0.03em", maxWidth: 700, textDecoration: bossState === "defeated" ? "line-through" : "none", opacity: bossState === "defeated" ? 0.6 : 1 }}>
        {boss.title}
      </h1>

      <div style={{ display: "flex", gap: 40, marginTop: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Rating</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--danger)" }}>{boss.rating}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>XP Reward</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--warning)" }}>500</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
        {boss.tags.map(tag => (
          <span key={tag} className="n-badge" style={{ background: "var(--danger-light)", color: "var(--danger)", padding: "4px 14px", fontSize: 12 }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Status message */}
      {verifyMessage && (
        <div style={{
          marginTop: 32,
          padding: "12px 24px",
          borderRadius: 12,
          background: bossState === "defeated" ? "var(--success-light)" : "var(--warning-light)",
          color: bossState === "defeated" ? "var(--success)" : "var(--warning)",
          fontSize: 14,
          fontWeight: 600,
          textAlign: "center",
          maxWidth: 500,
        }}>
          {verifyMessage}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: verifyMessage ? 24 : 56 }}>
        {bossState !== "defeated" && (
          <button
            className="n-btn-primary"
            style={{ padding: "16px 48px", fontSize: 16 }}
            onClick={handleEngage}
            disabled={bossState === "verifying"}
          >
            {stateLabel[bossState]}
          </button>
        )}
        {(bossState === "engaged" || bossState === "failed") && (
          <button
            className="n-btn-secondary"
            style={{ padding: "16px 32px", fontSize: 16, background: "var(--success-light)", color: "var(--success)", border: "1px solid var(--success)" }}
            onClick={handleVerify}
          >
            Verify Submission ✓
          </button>
        )}
        <button className="n-btn-secondary" style={{ padding: "16px 32px", fontSize: 16 }} onClick={() => router.push("/dashboard")}>
          {bossState === "defeated" ? "Return to Base" : "Retreat"}
        </button>
      </div>
    </div>
  );
}
