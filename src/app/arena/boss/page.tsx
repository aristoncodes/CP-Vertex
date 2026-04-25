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

export default function BossFightPage() {
  const router = useRouter();
  const [boss, setBoss] = useState<BossProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    fetch("/api/problems/boss").then(r => r.json()).then(d => { if (d.id) setBoss(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleEngage = async () => {
    if (!boss) return;
    setEngaged(true);
    try { await fetch("/api/missions/boss/engage", { method: "POST" }); window.open(boss.cfLink, "_blank"); } catch (e) { console.error(e); }
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #fef2f2 0%, #f7fafe 50%, #fef2f2 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: 32,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
        ⚠ High-Level Threat Detected
      </div>

      <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: "var(--text-primary)", textAlign: "center", letterSpacing: "-0.03em", maxWidth: 700 }}>
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

      <div style={{ display: "flex", gap: 12, marginTop: 56 }}>
        <button className="n-btn-primary" style={{ padding: "16px 48px", fontSize: 16 }} onClick={handleEngage}>
          {engaged ? "Combat Initiated" : "Engage Boss →"}
        </button>
        <button className="n-btn-secondary" style={{ padding: "16px 32px", fontSize: 16 }} onClick={() => router.push("/dashboard")}>
          Retreat
        </button>
      </div>
    </div>
  );
}
