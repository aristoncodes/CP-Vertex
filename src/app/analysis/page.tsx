"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function AnalysisLandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-redirect if user has a CF handle
  useEffect(() => {
    const cfHandle = session?.user?.cfHandle;
    if (cfHandle) {
      router.replace(`/analysis/${cfHandle}`);
    }
  }, [session, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = handle.trim();
    if (trimmed) router.push(`/analysis/${trimmed}`);
  };

  return (
    <DashboardLayout>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", minHeight: "60vh", gap: 24,
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 12px 32px rgba(91,79,212,0.25)",
        }}>
          <span className="material-symbols-outlined" style={{
            fontSize: 36, color: "#fff", fontVariationSettings: "'FILL' 1",
          }}>analytics</span>
        </div>

        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 500, color: "var(--text-primary)",
            letterSpacing: "-0.02em", marginBottom: 8,
          }}>
            Codeforces Analysis
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 480, lineHeight: 1.6 }}>
            Enter a Codeforces handle to generate actionable diagnostics — skill gaps, contest strategy,
            upsolve priorities, and personalized training.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, width: "100%", maxWidth: 420 }}>
          <input
            ref={inputRef}
            className="n-input"
            placeholder="Enter Codeforces handle..."
            value={handle}
            onChange={e => setHandle(e.target.value)}
            style={{ fontSize: 15, padding: "12px 18px", flex: 1 }}
            autoFocus
          />
          <button
            type="submit"
            className="n-btn-primary"
            style={{ padding: "12px 28px", fontSize: 14 }}
            disabled={!handle.trim()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
            Analyze
          </button>
        </form>

        {/* Quick suggestions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {["tourist", "Benq", "jiangly", "Um_nik"].map(h => (
            <button
              key={h}
              onClick={() => router.push(`/analysis/${h}`)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: "0.5px solid var(--border)",
                background: "var(--surface-card)", color: "var(--text-muted)",
                fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
