"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type SettingKey = "particles" | "scenes3d" | "smoothScroll" | "notifDigest" | "notifDuels" | "notifStreak";

function getStoredSetting(key: SettingKey, fallback: boolean = true): boolean {
  if (typeof window === "undefined") return fallback;
  const val = localStorage.getItem(`cp-vertex:${key}`);
  if (val === null) return fallback;
  return val === "1";
}

function setStoredSetting(key: SettingKey, val: boolean) {
  localStorage.setItem(`cp-vertex:${key}`, val ? "1" : "0");
}

interface ChallengeInfo {
  problemName: string;
  problemUrl: string;
  contestId: number;
  index: string;
  instruction: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [handle, setHandle] = useState("");
  const [initialHandle, setInitialHandle] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cfVerified, setCfVerified] = useState(false);

  // Verification flow
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const [particles, setParticles] = useState(true);
  const [scenes3d, setScenes3d] = useState(true);
  const [smoothScroll, setSmoothScroll] = useState(true);
  const [notifDigest, setNotifDigest] = useState(true);
  const [notifDuels, setNotifDuels] = useState(true);
  const [notifStreak, setNotifStreak] = useState(true);

  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(d => {
      if (d.cfHandle) { setHandle(d.cfHandle); setInitialHandle(d.cfHandle); }
      if (d.cfLastSync) setLastSync(new Date(d.cfLastSync).toLocaleString());
      if (d.cfVerified) setCfVerified(true);
    }).catch(console.error);

    setParticles(getStoredSetting("particles"));
    setScenes3d(getStoredSetting("scenes3d"));
    setSmoothScroll(getStoredSetting("smoothScroll"));
    setNotifDigest(getStoredSetting("notifDigest"));
    setNotifDuels(getStoredSetting("notifDuels"));
    setNotifStreak(getStoredSetting("notifStreak"));
  }, []);

  const toggle = (key: SettingKey, current: boolean, setter: (v: boolean) => void) => {
    const next = !current;
    setter(next);
    setStoredSetting(key, next);
  };

  // Step 1: Link handle & get CE challenge
  const handleLinkCF = async () => {
    if (!handle || handle.length < 3) return alert("Please enter a valid Codeforces handle");
    setSyncing(true);
    setVerifyError(null);
    setChallenge(null);
    try {
      const res = await fetch("/api/user/cf-handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Error: " + (data.error || "Failed"));
        return;
      }
      setInitialHandle(handle);
      setChallenge(data.challenge);
    } catch { alert("Connection failed."); }
    finally { setSyncing(false); }
  };

  // Step 2: Verify CE submission
  const handleVerifyCE = async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/user/cf-handle", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Verification failed");
        return;
      }
      setVerifySuccess(true);
      setCfVerified(true);
      setChallenge(null);
      setLastSync(new Date().toLocaleString());

      // Update NextAuth session to trigger AutoSyncProvider correctly for future background syncs
      if (typeof window !== "undefined") {
        import("next-auth/react").then(({ getSession }) => {
          getSession(); // Forces NextAuth to refresh the session context with the new cfHandle
        });
      }

    } catch { setVerifyError("Connection failed."); }
    finally { setVerifying(false); }
  };

  // Sync existing handle
  const handleSync = async () => {
    if (!handle) return alert("Please enter a Codeforces handle first");
    setSyncing(true);
    try {
      const syncRes = await fetch("/api/user/cf-handle/sync", { method: "POST" });
      const syncData = await syncRes.json();
      if (!syncRes.ok) alert("Error: " + (syncData.error || "Failed"));
      else { alert(`Sync complete! Imported ${syncData.imported} new submissions.`); setLastSync(new Date().toLocaleString()); }
    } catch { alert("Connection to Codeforces API failed."); }
    finally { setSyncing(false); }
  };

  // Full historical re-sync (backfills all heatmap data)
  const handleFullSync = async () => {
    if (!handle) return alert("Please enter a Codeforces handle first");
    const confirm = window.confirm(
      "This will pull ALL your Codeforces submissions to fully populate your heatmap and solve count. This may take a minute. Continue?"
    );
    if (!confirm) return;
    setSyncing(true);
    try {
      const syncRes = await fetch("/api/user/cf-handle/sync?full=true", { method: "POST" });
      const syncData = await syncRes.json();
      if (!syncRes.ok) alert("Error: " + (syncData.error || "Failed"));
      else { alert(`Full sync complete! Imported ${syncData.imported} submissions.`); setLastSync(new Date().toLocaleString()); }
    } catch { alert("Connection to Codeforces API failed."); }
    finally { setSyncing(false); }
  };

  const handleReset = async () => {
    const first = window.confirm("This will permanently delete ALL your progress. Continue?");
    if (!first) return;
    const second = window.prompt("Type RESET MY ACCOUNT to confirm:");
    if (second !== "RESET MY ACCOUNT") { alert("Reset cancelled."); return; }
    setResetting(true);
    try {
      const res = await fetch("/api/user/reset", { method: "POST" });
      if (res.ok) { alert("Account reset complete."); router.push("/dashboard"); }
      else { const d = await res.json(); alert("Error: " + (d.error || "Failed")); }
    } catch { alert("Server unreachable."); }
    finally { setResetting(false); }
  };

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} style={{
      width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
      background: enabled ? "var(--primary)" : "var(--surface-highest)",
      transition: "background 0.2s",
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "white",
        position: "absolute", top: 3,
        left: enabled ? 23 : 3,
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );

  const SettingRow = ({ label, desc, enabled, onToggle }: { label: string; desc?: string; enabled: boolean; onToggle: () => void }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>}
      </div>
      <ToggleSwitch enabled={enabled} onToggle={onToggle} />
    </div>
  );

  return (
    <DashboardLayout>
      <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Settings</h1>

      {/* CF Handle */}
      <div className="n-card" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="n-section-label" style={{ margin: 0 }}>Codeforces Link</div>
          {cfVerified && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: "var(--success-light)", color: "var(--success)",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>verified</span>
              Verified
            </span>
          )}
          {initialHandle && !cfVerified && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: "var(--warning-light)", color: "var(--warning)",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>warning</span>
              Unverified
            </span>
          )}
        </div>

        {!cfVerified ? (
          <>
            {/* Step 1: Enter handle */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
              <input
                className="n-input"
                placeholder="your_cf_handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="n-btn-primary" style={{ padding: "10px 20px" }} onClick={handleLinkCF} disabled={syncing}>
                {syncing ? "Checking..." : "Link & Verify"}
              </button>
            </div>

            {/* Step 2: CE Challenge */}
            {challenge && (
              <div style={{
                marginTop: 16, padding: "20px 24px",
                background: "var(--primary-light)", borderRadius: 14,
                border: "1px solid var(--border-hover)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>task_alt</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Verification Challenge</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 12px" }}>
                  To prove you own <strong>&quot;{handle}&quot;</strong>, submit a <strong style={{ color: "var(--danger)" }}>Compilation Error (CE)</strong> on the following problem:
                </p>
                <a
                  href={challenge.problemUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 20px", borderRadius: 10,
                    background: "var(--surface-card)", border: "1px solid var(--border)",
                    color: "var(--primary)", fontWeight: 700, fontSize: 14,
                    textDecoration: "none", marginBottom: 12,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>open_in_new</span>
                  {challenge.contestId}{challenge.index} — {challenge.problemName}
                </a>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px" }}>
                  💡 Tip: Just submit <code style={{ background: "var(--surface-high)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>asdf</code> as your code in any language. It will give CE. You have 5 minutes.
                </p>

                {verifyError && (
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 12,
                    background: "var(--danger-light)", color: "var(--danger)",
                    fontSize: 12, fontWeight: 600,
                  }}>
                    ✗ {verifyError}
                  </div>
                )}

                <button className="n-btn-primary" onClick={handleVerifyCE} disabled={verifying} style={{ padding: "10px 24px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                  {verifying ? "Verifying & Syncing History..." : "I submitted CE — Verify Now"}
                </button>
              </div>
            )}

            {verifySuccess && (
              <div style={{
                marginTop: 16, padding: "16px 20px",
                background: "var(--success-light)", borderRadius: 12,
                color: "var(--success)", fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                Codeforces handle verified! You can now participate in duels.
              </div>
            )}
          </>
        ) : (
          <>
            {/* Already verified — show handle + sync */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12 }}>
              <input className="n-input" value={handle} disabled style={{ flex: 1, opacity: 0.7 }} />
              <button className="n-btn-secondary" style={{ padding: "10px 20px" }} onClick={handleSync} disabled={syncing}>
                {syncing ? "Syncing..." : "Re-sync"}
              </button>
              <button
                className="n-btn-secondary"
                style={{ padding: "10px 20px", fontSize: 12 }}
                onClick={handleFullSync}
                disabled={syncing}
                title="Pull ALL submissions from Codeforces to fully populate your heatmap"
              >
                {syncing ? "..." : "Full Re-sync"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              Last synced: {lastSync || "Never"} · <strong>Full Re-sync</strong> imports your entire CF history (heatmap + solve count). · To change handles, contact support.
            </div>
          </>
        )}
      </div>

      {/* Appearance */}
      <div className="n-card" style={{ padding: "24px 28px" }}>
        <div className="n-section-label">Appearance</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SettingRow label="Particle Effects" desc="Background particle animations" enabled={particles} onToggle={() => toggle("particles", particles, setParticles)} />
          <SettingRow label="3D Scenes" desc="WebGL-powered visualizations" enabled={scenes3d} onToggle={() => toggle("scenes3d", scenes3d, setScenes3d)} />
          <SettingRow label="Smooth Scroll" desc="Kinetic scroll behavior" enabled={smoothScroll} onToggle={() => toggle("smoothScroll", smoothScroll, setSmoothScroll)} />
        </div>
      </div>

      {/* Notifications */}
      <div className="n-card" style={{ padding: "24px 28px" }}>
        <div className="n-section-label">Notifications</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SettingRow label="Weekly Digest" desc="Performance summary emails" enabled={notifDigest} onToggle={() => toggle("notifDigest", notifDigest, setNotifDigest)} />
          <SettingRow label="Duel Challenges" desc="Notifications for incoming duels" enabled={notifDuels} onToggle={() => toggle("notifDuels", notifDuels, setNotifDuels)} />
          <SettingRow label="Streak Reminders" desc="Daily reminders to maintain streak" enabled={notifStreak} onToggle={() => toggle("notifStreak", notifStreak, setNotifStreak)} />
        </div>
      </div>

      {/* Danger zone */}
      <div className="n-card" style={{ padding: "24px 28px", borderColor: "rgba(220,38,38,0.3)" }}>
        <div className="n-section-label" style={{ color: "var(--danger)" }}>Danger Zone</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Reset All Progress</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Permanently delete all XP, submissions, and badges</div>
          </div>
          <button onClick={handleReset} disabled={resetting} style={{
            padding: "8px 20px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", cursor: "pointer",
            background: "rgba(220,38,38,0.08)", color: "var(--danger)", fontFamily: "'Inter', sans-serif",
          }}>
            {resetting ? "Resetting..." : "Reset Account"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
