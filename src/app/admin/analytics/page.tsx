"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  overview: {
    totalUsers: number;
    totalProblems: number;
    totalSubmissions: number;
    totalDuels: number;
    onlineNow: number;
  };
  growth: {
    usersToday: number;
    usersThisWeek: number;
    usersThisMonth: number;
    submissionsToday: number;
    submissionsThisWeek: number;
    submissionsThisMonth: number;
    duelsThisWeek: number;
  };
  recentUsers: {
    id: string;
    name: string | null;
    email: string;
    cfHandle: string | null;
    xp: number;
    level: number;
    createdAt: string;
    image: string | null;
  }[];
  topUsersByXP: {
    id: string;
    name: string | null;
    cfHandle: string | null;
    xp: number;
    level: number;
    cfRating: number | null;
    image: string | null;
  }[];
  submissionsByVerdict: { verdict: string; count: number }[];
  dailySubmissions: { date: string; count: number }[];
}

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setError("ACCESS DENIED — You are not authorized to view this page.");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch {
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
          <div style={{
            width: 48, height: 48, border: "4px solid var(--border)",
            borderTop: "4px solid var(--primary)", borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <span style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>Loading analytics...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "60vh", gap: 20,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: "var(--danger)", fontVariationSettings: "'FILL' 1" }}>
            shield_lock
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>Access Restricted</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 400, textAlign: "center" }}>
            {error}
          </p>
          <button className="n-btn-secondary" onClick={() => router.push("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) return null;

  const o = stats.overview;
  const g = stats.growth;

  // Calculate max for daily submission bar chart
  const maxDaily = Math.max(...stats.dailySubmissions.map(d => d.count), 1);

  // Verdict colors
  const verdictColors: Record<string, string> = {
    OK: "var(--success)",
    WRONG_ANSWER: "var(--danger)",
    TIME_LIMIT_EXCEEDED: "var(--warning)",
    RUNTIME_ERROR: "#d946ef",
    COMPILATION_ERROR: "#f97316",
    MEMORY_LIMIT_EXCEEDED: "#0891b2",
  };

  const totalVerdicts = stats.submissionsByVerdict.reduce((s, v) => s + v.count, 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>
              admin_panel_settings
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
              Admin <span style={{ color: "var(--primary)" }}>Analytics</span>
            </h1>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
            Platform metrics · Last refreshed {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Online now indicator */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: "var(--radius-full)",
            background: "var(--success-light)", border: "1px solid rgba(5, 150, 105, 0.2)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: "var(--success)",
              animation: "pulse-dot 2s infinite",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>
              {o.onlineNow} online
            </span>
          </div>
          <button className="n-btn-secondary" style={{ fontSize: 12, padding: "8px 16px" }} onClick={fetchStats}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <div className="n-section-label">Platform Overview</div>
        <div className="stats-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Total Users", value: o.totalUsers.toLocaleString(), delta: `+${g.usersToday} today`, color: "var(--primary)", icon: "group", deltaPositive: g.usersToday > 0 },
            { label: "Submissions", value: o.totalSubmissions.toLocaleString(), delta: `+${g.submissionsToday} today`, color: "var(--success)", icon: "code", deltaPositive: g.submissionsToday > 0 },
            { label: "Problems", value: o.totalProblems.toLocaleString(), delta: "in database", color: "var(--warning)", icon: "extension", deltaPositive: false },
            { label: "Duels", value: o.totalDuels.toLocaleString(), delta: `+${g.duelsThisWeek} this week`, color: "var(--info)", icon: "swords", deltaPositive: g.duelsThisWeek > 0 },
          ].map((stat) => (
            <div key={stat.label} className="n-card" style={{ padding: "20px 18px", position: "relative", overflow: "hidden" }}>
              {/* Subtle background icon */}
              <span className="material-symbols-outlined" style={{
                position: "absolute", right: -8, bottom: -8, fontSize: 80,
                color: stat.color, opacity: 0.04, fontVariationSettings: "'FILL' 1",
              }}>
                {stat.icon}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: stat.color, fontVariationSettings: "'FILL' 1" }}>
                  {stat.icon}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stat.label}
                </span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color, letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600, marginTop: 8,
                color: stat.deltaPositive ? "var(--success)" : "var(--text-muted)",
              }}>
                {stat.delta}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Growth Metrics */}
      <div>
        <div className="n-section-label">Growth Metrics</div>
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { label: "New Users", periods: [
                { period: "Today", value: g.usersToday },
                { period: "This Week", value: g.usersThisWeek },
                { period: "This Month", value: g.usersThisMonth },
              ], color: "var(--primary)" },
              { label: "Submissions", periods: [
                { period: "Today", value: g.submissionsToday },
                { period: "This Week", value: g.submissionsThisWeek },
                { period: "This Month", value: g.submissionsThisMonth },
              ], color: "var(--success)" },
              { label: "Duels Played", periods: [
                { period: "This Week", value: g.duelsThisWeek },
              ], color: "var(--info)" },
            ].map((metric) => (
              <div key={metric.label}>
                <div style={{ fontSize: 13, fontWeight: 700, color: metric.color, marginBottom: 12 }}>
                  {metric.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {metric.periods.map((p) => (
                    <div key={p.period} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.period}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Activity Chart + Verdict Distribution */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Daily Submissions Bar Chart */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div className="n-section-label">Daily Submissions (Last 7 Days)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, marginTop: 12 }}>
            {stats.dailySubmissions.length === 0 ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
                No submission data yet
              </div>
            ) : (
              stats.dailySubmissions.map((d, i) => {
                const barH = Math.max(Math.round((d.count / maxDaily) * 120), d.count > 0 ? 6 : 2);
                const dateLabel = new Date(d.date).toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)" }}>
                      {d.count > 0 ? d.count : ""}
                    </span>
                    <div style={{ width: "100%", height: 120, background: "var(--surface-high)", borderRadius: "4px 4px 0 0", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                      <div style={{
                        width: "100%", height: barH,
                        background: "linear-gradient(180deg, var(--primary), #60a5fa)",
                        borderRadius: "4px 4px 0 0", opacity: 0.85,
                        transition: "height 0.6s ease",
                      }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textAlign: "center" }}>
                      {dateLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Verdict Distribution */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div className="n-section-label">Verdicts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {stats.submissionsByVerdict.slice(0, 6).map((v) => {
              const pct = totalVerdicts > 0 ? ((v.count / totalVerdicts) * 100) : 0;
              const color = verdictColors[v.verdict] || "var(--text-muted)";
              const shortVerdict = v.verdict
                .replace("WRONG_ANSWER", "WA")
                .replace("TIME_LIMIT_EXCEEDED", "TLE")
                .replace("RUNTIME_ERROR", "RE")
                .replace("COMPILATION_ERROR", "CE")
                .replace("MEMORY_LIMIT_EXCEEDED", "MLE")
                .replace("OK", "AC");
              return (
                <div key={v.verdict}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{shortVerdict}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {v.count.toLocaleString()} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "var(--surface-high)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Users + Top Users */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Recent Users */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div className="n-section-label">Recent Signups</div>
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table className="n-table" style={{ minWidth: 400 }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Handle</th>
                  <th>Level</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {u.image ? (
                          <img src={u.image} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>
                              {(u.name || u.email)?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name || u.email.split("@")[0]}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--primary)" }}>{u.cfHandle || "—"}</td>
                    <td>
                      <span className="n-badge n-badge--easy" style={{ fontSize: 11 }}>Lv.{u.level}</span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="n-card" style={{ padding: "20px 24px" }}>
          <div className="n-section-label">Top Users by XP</div>
          <div style={{ marginTop: 12 }}>
            {stats.topUsersByXP.map((u, i) => (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: i < stats.topUsersByXP.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: i === 0 ? "linear-gradient(135deg, #f59e0b, #fbbf24)" : i === 1 ? "linear-gradient(135deg, #94a3b8, #cbd5e1)" : i === 2 ? "linear-gradient(135deg, #d97706, #f59e0b)" : "var(--surface-high)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: i < 3 ? "#fff" : "var(--text-muted)",
                }}>
                  {i + 1}
                </div>
                {u.image ? (
                  <img src={u.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                      {(u.name || "?")?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {u.name || u.cfHandle || "Anonymous"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Lv.{u.level} · {u.cfRating ? `CF ${u.cfRating}` : "—"}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--warning)" }}>
                  {u.xp.toLocaleString()} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vercel Analytics reminder */}
      <div className="n-card" style={{
        padding: "16px 24px", display: "flex", alignItems: "center", gap: 14,
        background: "var(--primary-lighter)", border: "1px solid rgba(3, 102, 214, 0.1)",
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: "var(--primary)" }}>info</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Vercel Analytics is Active
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Page views, Web Vitals, and traffic data are available in your{" "}
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>
              Vercel Dashboard → Analytics tab
            </a>.
            This page shows your platform's internal metrics from the database.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
