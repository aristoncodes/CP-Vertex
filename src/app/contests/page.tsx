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

export default function ContestsPage() {
  const router = useRouter();
  const [upcoming, setUpcoming] = useState<Contest[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [starting, setStarting] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/contests/virtual").then(r => r.json()).then(d => { if (d.active) setActiveSession(d.session); });
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
      router.push(`/contests/live/${data.session.id}`);
    } catch { alert("Server offline."); setStarting(null); }
  };

  return (
    <DashboardLayout>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Contests</h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4, fontWeight: 500 }}>Simulate live Codeforces contests for XP</p>
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

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 15 }}>Loading contests...</div>
      ) : fetchError ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>{fetchError}</div>
      ) : contests.length === 0 && upcoming.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          No untouched contests found. Sync your Codeforces handle in Settings.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Upcoming Contests */}
          {upcoming.length > 0 && (
            <div style={{ border: "1px solid #b9b9b9", borderRadius: "3px", background: "white", fontSize: "13px", overflow: "hidden" }}>
              <div style={{ background: "#f8f8f9", padding: "6px 10px", borderBottom: "1px solid #b9b9b9", fontWeight: "bold", color: "#3B5998", fontSize: "13px", display: "flex", alignItems: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px", marginRight: "6px" }}>event</span>
                Current or upcoming contests
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e1e1e1", textAlign: "center", color: "#222" }}>
                    <th style={{ padding: "8px", textAlign: "left", width: "45%", borderRight: "1px solid #e1e1e1", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Name</th>
                    <th style={{ padding: "8px", borderRight: "1px solid #e1e1e1", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Start</th>
                    <th style={{ padding: "8px", borderRight: "1px solid #e1e1e1", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Length</th>
                    <th style={{ padding: "8px", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((c, idx) => {
                    const startDate = new Date(c.startTimeSeconds * 1000);
                    const startFormatted = `${startDate.toLocaleString('en-US', { month: 'short' })}/${startDate.getDate().toString().padStart(2, '0')}/${startDate.getFullYear()} ${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
                    
                    const lengthHours = Math.floor(c.durationSeconds / 3600);
                    const lengthMinutes = Math.floor((c.durationSeconds % 3600) / 60);
                    const lengthFormatted = `${lengthHours.toString().padStart(2, '0')}:${lengthMinutes.toString().padStart(2, '0')}`;
                    
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #e1e1e1", background: idx % 2 === 0 ? "white" : "#f8f8f9", textAlign: "center" }}>
                        <td style={{ padding: "10px", textAlign: "left", borderRight: "1px solid #e1e1e1" }}>
                          <div style={{ color: "#3B5998", fontWeight: "bold" }}>{c.name}</div>
                          <div style={{ fontSize: "11px", marginTop: "4px", color: "var(--text-muted)" }}>
                            Cannot participate virtually yet.
                          </div>
                        </td>
                        <td style={{ padding: "10px", borderRight: "1px solid #e1e1e1", fontSize: "12px", color: "#000" }}>
                          <a href="#" style={{ color: "#0000cc", textDecoration: "none" }}>{startFormatted}</a>
                        </td>
                        <td style={{ padding: "10px", borderRight: "1px solid #e1e1e1", fontSize: "12px", color: "#000" }}>
                          {lengthFormatted}
                        </td>
                        <td style={{ padding: "10px", fontSize: "12px" }}>
                          <span style={{ color: "var(--text-muted)" }}>
                            Upcoming
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Past Contests */}
          {contests.length > 0 && (
            <div style={{ border: "1px solid #b9b9b9", borderRadius: "3px", background: "white", fontSize: "13px", overflow: "hidden" }}>
              <div style={{ background: "#f8f8f9", padding: "6px 10px", borderBottom: "1px solid #b9b9b9", fontWeight: "bold", color: "#3B5998", fontSize: "13px", display: "flex", alignItems: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px", marginRight: "6px" }}>format_list_bulleted</span>
                Untouched past contests
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e1e1e1", textAlign: "center", color: "#222" }}>
                    <th style={{ padding: "8px", textAlign: "left", width: "45%", borderRight: "1px solid #e1e1e1", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Name</th>
                    <th style={{ padding: "8px", borderRight: "1px solid #e1e1e1", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Start</th>
                    <th style={{ padding: "8px", borderRight: "1px solid #e1e1e1", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Length</th>
                    <th style={{ padding: "8px", fontWeight: "bold", background: "#f8f8f9", fontSize: 12 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {contests.map((c, idx) => {
                    const startDate = new Date(c.startTimeSeconds * 1000);
                    const startFormatted = `${startDate.toLocaleString('en-US', { month: 'short' })}/${startDate.getDate().toString().padStart(2, '0')}/${startDate.getFullYear()} ${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
                    
                    const lengthHours = Math.floor(c.durationSeconds / 3600);
                    const lengthMinutes = Math.floor((c.durationSeconds % 3600) / 60);
                    const lengthFormatted = `${lengthHours.toString().padStart(2, '0')}:${lengthMinutes.toString().padStart(2, '0')}`;
                    
                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid #e1e1e1", background: idx % 2 === 0 ? "white" : "#f8f8f9", textAlign: "center", opacity: activeSession ? 0.6 : 1 }}>
                        <td style={{ padding: "10px", textAlign: "left", borderRight: "1px solid #e1e1e1" }}>
                          <div style={{ color: "#3B5998", fontWeight: "bold" }}>{c.name}</div>
                          <div style={{ fontSize: "11px", marginTop: "4px" }}>
                            <button onClick={() => startVirtual(c.id)} disabled={!!activeSession || starting === c.id} style={{ color: "#3B5998", textDecoration: "none", background: "none", border: "none", cursor: starting === c.id || activeSession ? "not-allowed" : "pointer", padding: 0 }}>
                              {starting === c.id ? "Starting..." : "Virtual participation »"}
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: "10px", borderRight: "1px solid #e1e1e1", fontSize: "12px", color: "#000" }}>
                          <a href="#" style={{ color: "#0000cc", textDecoration: "none" }}>{startFormatted}</a>
                        </td>
                        <td style={{ padding: "10px", borderRight: "1px solid #e1e1e1", fontSize: "12px", color: "#000" }}>
                          {lengthFormatted}
                        </td>
                        <td style={{ padding: "10px", fontSize: "12px" }}>
                          <span style={{ color: activeSession ? "var(--text-muted)" : "#000" }}>
                            {activeSession ? "Disabled" : "Available"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
