"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Contest {
  id: number;
  name: string;
  type: string;
  durationSeconds: number;
  startTimeSeconds: number;
}

interface LiveContest {
  id: number;
  name: string;
  type: string;
  phase?: string;
  durationSeconds: number;
  startTimeSeconds: number;
  startDate: string;
  isRunning?: boolean;
}

function formatCountdown(startSec: number) {
  const diff = startSec - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Started";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatDate(sec: number) {
  const d = new Date(sec * 1000);
  return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}, ${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function ContestsPage() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Contest[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [liveContests, setLiveContests] = useState<LiveContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [starting, setStarting] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/contests/virtual").then(r => r.json()).then(d => { if (d.active) setActiveSession(d.session); });

    // Fetch live CF contests (#12)
    fetch("/api/contests/live").then(r => r.json()).then(d => {
      if (d.upcoming) setLiveContests(d.upcoming);
    }).catch(() => {});

    // Existing untouched contests
    fetch("/api/contests/untouched").then(r => r.json()).then(d => {
      if (d.error) throw new Error(d.error);
      if (d.upcoming) setUpcoming(d.upcoming);
      if (d.contests) setContests(d.contests);
      setLoading(false);
    }).catch(e => { setLoading(false); setFetchError(e.message || "Failed to fetch contests"); });
  }, []);

  const startVirtual = async (contestId: number) => {
    if (activeSession) { alert("You already have an active contest!"); return; }
    setStarting(contestId);
    try {
      const res = await fetch("/api/contests/virtual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contestId }) });
      const data = await res.json();
      if (!res.ok) { alert("Error: " + (data.error || "Failed")); setStarting(null); return; }
      
      // Open Codeforces virtual participation page in a new tab
      window.open(`https://codeforces.com/contestRegistration/${contestId}/virtual/true`, "_blank");
      
      router.push(`/contests/live/${data.session.id}`);
    } catch { alert("Server offline."); setStarting(null); }
  };

  const addToCalendar = (contest: LiveContest) => {
    const start = new Date(contest.startTimeSeconds * 1000);
    const end = new Date((contest.startTimeSeconds + contest.durationSeconds) * 1000);
    const startStr = start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endStr = end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(contest.name)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(`Codeforces ${contest.type} Contest\nhttps://codeforces.com/contest/${contest.id}`)}`;
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Contests</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>Live calendar & virtual contest simulation</p>
        </div>
        <button 
          className="n-btn-secondary" 
          onClick={() => router.push("/contests/gym-finder")} 
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#3b82f6" }}>bolt</span>
          Gym Problem Finder
        </button>
      </div>

      {activeSession && (
        <div className="n-card" style={{ padding: "18px 24px", borderColor: "var(--primary)", background: "var(--primary-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--primary)" }}>Active Session</div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>You have a contest in progress.</p>
          </div>
          <button className="n-btn-primary" style={{ padding: "10px 24px" }} onClick={() => router.push(`/contests/live/${activeSession.id}`)}>
            Resume →
          </button>
        </div>
      )}

      {/* ─── Live Contest Calendar (#12) ─── */}
      {liveContests.length > 0 && (
        <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--success)", fontVariationSettings: "'FILL' 1" }}>event</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Live Codeforces Calendar</span>
            <span className="n-badge" style={{ marginLeft: "auto", background: "var(--success-light)", color: "var(--success)", fontSize: 11 }}>
              {liveContests.length} upcoming
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {liveContests.map((c, i) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px", borderBottom: i < liveContests.length - 1 ? "1px solid var(--border)" : "none",
                background: c.isRunning ? "var(--success-light)" : "transparent",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <a
                      href={`https://codeforces.com/contest/${c.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                    >
                      {c.name}
                    </a>
                    {c.isRunning && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px",
                        borderRadius: 20, background: "var(--success)", color: "white",
                        animation: "pulse-dot 2s ease-in-out infinite",
                      }}>LIVE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 12 }}>
                    <span>{formatDate(c.startTimeSeconds)}</span>
                    <span>·</span>
                    <span>{formatDuration(c.durationSeconds)}</span>
                    <span>·</span>
                    <span>{c.type}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!c.isRunning && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
                      {formatCountdown(c.startTimeSeconds)}
                    </span>
                  )}
                  <button
                    onClick={() => addToCalendar(c)}
                    className="n-btn-secondary"
                    style={{ padding: "5px 12px", fontSize: 12 }}
                    title="Add to Google Calendar"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_add_on</span>
                  </button>
                  <a
                    href={`https://codeforces.com/contestRegistration/${c.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="n-btn-primary"
                    style={{ padding: "5px 14px", fontSize: 12, textDecoration: "none" }}
                  >
                    Register
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>Loading contests...</div>
      ) : fetchError ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>{fetchError}</div>
      ) : contests.length === 0 && upcoming.length === 0 ? (
        /* Empty state with CTA (#3) */
        <div style={{ padding: 48, textAlign: "center" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--text-faint)", display: "block", marginBottom: 12 }}>emoji_events</span>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>No Untouched Contests</div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>
            Link your Codeforces handle to discover contests you haven&apos;t participated in yet.
          </p>
          <button className="n-btn-primary" onClick={() => router.push("/settings")} style={{ padding: "10px 24px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span>
            Link Codeforces
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Upcoming Contests */}
          {upcoming.length > 0 && (
            <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--warning)", fontVariationSettings: "'FILL' 1" }}>schedule</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Upcoming Contests</span>
              </div>
              <table className="n-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th style={{ width: 140, textAlign: "center" }}>Start</th>
                    <th style={{ width: 80, textAlign: "center" }}>Length</th>
                    <th style={{ width: 80, textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>{formatDate(c.startTimeSeconds)}</td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>{formatDuration(c.durationSeconds)}</td>
                      <td style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>Upcoming</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Past Contests for Virtual */}
          {contests.length > 0 && (
            <div className="n-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>format_list_bulleted</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Virtual Participation</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>Untouched past contests</span>
              </div>
              <table className="n-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Contest</th>
                    <th style={{ width: 140, textAlign: "center" }}>Date</th>
                    <th style={{ width: 80, textAlign: "center" }}>Length</th>
                    <th style={{ width: 120, textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contests.map(c => (
                    <tr key={c.id} style={{ opacity: activeSession ? 0.6 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                      </td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>{formatDate(c.startTimeSeconds)}</td>
                      <td style={{ textAlign: "center", fontSize: 12 }}>{formatDuration(c.durationSeconds)}</td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => startVirtual(c.id)}
                          disabled={!!activeSession || starting === c.id}
                          className="n-btn-primary"
                          style={{ padding: "5px 14px", fontSize: 12, opacity: activeSession ? 0.5 : 1 }}
                        >
                          {starting === c.id ? "Starting..." : "Start Virtual"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
