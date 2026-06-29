"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStats } from "@/hooks/useUserStats";
import { useContestAnalysis } from "@/hooks/useContestAnalysis";
import { useTrainingRecommendations } from "@/hooks/useTrainingRecommendations";
import { useRivalry } from "@/hooks/useRivalry";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { clearCFCache, getLastFetchTime } from "@/hooks/useCFCache";
import { getRatingColor, getRatingTierName } from "@/lib/colors";

import { MetricRow } from "@/components/analysis/MetricRow";
import { SkillGapDiagnostics } from "@/components/analysis/SkillGapDiagnostics";
import { ContestStrategy } from "@/components/analysis/ContestStrategy";
import { TrainingRoadmap } from "@/components/analysis/TrainingRoadmap";
import { RivalryBoard } from "@/components/analysis/RivalryBoard";
import { SystemHealth } from "@/components/analysis/SystemHealth";
import { ExtendedInsights } from "@/components/analysis/ExtendedInsights";

const TABS = ["Overview", "Insights", "Diagnose", "Strategy", "Train"] as const;
type Tab = (typeof TABS)[number];

const TAB_SECTIONS: Record<Tab, string[]> = {
  Overview: ["metrics", "skillGap", "contestStrategy", "training", "rivalry", "systemHealth"],
  Insights: ["extendedInsights"],
  Diagnose: ["metrics", "skillGap"],
  Strategy: ["contestStrategy"],
  Train: ["training", "rivalry"],
};

/**
 * The full Codeforces handle-analysis dashboard. Rendered both for the
 * logged-in `/analysis/[handle]` route and the public, no-login
 * `/u/[handle]` route. All data is fetched directly from the Codeforces
 * API via the hooks below, so it works with or without a session.
 */
export function HandleAnalyzer({
  handle,
  isLoggedIn,
  isOwnProfile,
}: {
  handle: string;
  isLoggedIn: boolean;
  isOwnProfile: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [tickCount, setTickCount] = useState(0);
  const [compareInput, setCompareInput] = useState("");

  const startCompare = (e: React.FormEvent) => {
    e.preventDefault();
    const other = compareInput.trim();
    if (other) router.push(`/u/${encodeURIComponent(handle)}/vs/${encodeURIComponent(other)}`);
  };

  const userStats = useUserStats(handle, refreshKey);
  const contestAnalysis = useContestAnalysis(handle, userStats.rating, refreshKey);
  const training = useTrainingRecommendations(handle, userStats.rating, userStats.weakestTags, userStats.solvedProblemIds);
  const rivalry = useRivalry(handle, refreshKey);
  const systemHealth = useSystemHealth();

  // Derive last-updated label from cache timestamp (no setState in effect)
  const lastUpdated = (() => {
    void tickCount; // re-derive every 30s
    if (userStats.loading || !handle) return null;
    const ts = getLastFetchTime(handle);
    return ts ? formatTimeAgo(ts) : null;
  })();

  useEffect(() => {
    const interval = setInterval(() => setTickCount(c => c + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    clearCFCache();
    setRefreshKey(k => k + 1);
  }, []);

  // System health is internal/ops detail — only show it to signed-in users.
  const visibleSections = TAB_SECTIONS[activeTab].filter(
    (s) => isLoggedIn || s !== "systemHealth"
  );
  const initials = handle.slice(0, 2).toUpperCase();
  const tierColor = getRatingColor(userStats.rating);

  return (
    <>
      {/* ── Top Bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 4, flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Analysis
          </h1>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px 5px 6px",
            background: "var(--surface-low)", borderRadius: "var(--radius-full)",
            border: "0.5px solid var(--border)",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 500, color: "#fff",
            }}>
              {initials}
            </div>
            <a
              href={`https://codeforces.com/profile/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: tierColor, textDecoration: "none" }}
              title={`${getRatingTierName(userStats.rating)} — open on Codeforces`}
            >
              {handle}
            </a>
            {isOwnProfile && (
              <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 500 }}>you</span>
            )}
          </div>

          {/* Last updated + Refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                Updated {lastUpdated}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={userStats.loading}
              title="Refresh data (clears 5-min cache)"
              style={{
                width: 30, height: 30, borderRadius: 8, border: "0.5px solid var(--border)",
                background: "var(--surface-card)", cursor: userStats.loading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s", opacity: userStats.loading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!userStats.loading) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--surface-low)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface-card)"; }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: 16, color: "var(--text-muted)",
                animation: userStats.loading ? "spin 1s linear infinite" : "none",
              }}>refresh</span>
            </button>
          </div>

          {/* Compare vs another handle (shareable head-to-head) */}
          <form onSubmit={startCompare} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value)}
              placeholder="Compare vs…"
              aria-label="Compare against another handle"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: 130, padding: "6px 12px", fontSize: 12, borderRadius: 8,
                border: "0.5px solid var(--border)", background: "var(--surface-card)",
                color: "var(--text-primary)", fontFamily: "'Inter', sans-serif", outline: "none",
              }}
            />
            <button type="submit" title="Compare" style={{
              width: 30, height: 30, borderRadius: 8, border: "0.5px solid var(--border)",
              background: "var(--surface-card)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: "var(--text-muted)" }}>compare_arrows</span>
            </button>
          </form>
        </div>

        {/* Tab nav */}
        <div className="analyzer-tabs" style={{
          display: "flex", gap: 2,
          background: "var(--surface-low)", borderRadius: 10, padding: 3,
          border: "0.5px solid var(--border)",
        }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "7px 18px", borderRadius: 8, border: "none",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s",
                background: activeTab === tab ? "var(--surface-card)" : "transparent",
                color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: activeTab === tab ? "var(--shadow-sm)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Sign-in CTA for anonymous visitors */}
      {!isLoggedIn && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          flexWrap: "wrap", padding: "10px 16px", marginBottom: 4,
          background: "var(--primary-lighter)", border: "0.5px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Viewing a read-only analysis. Sign in to track your own progress, train your weak topics, and earn XP.
          </span>
          <a href="/login" className="n-btn-primary" style={{ padding: "8px 18px", fontSize: 13, whiteSpace: "nowrap" }}>
            Sign in
          </a>
        </div>
      )}

      {/* ── Metric Row ── */}
      {visibleSections.includes("metrics") && (
        <MetricRow
          rating={userStats.rating}
          ratingDelta={userStats.ratingDelta}
          solveRate={userStats.solveRate}
          solveRateDelta={userStats.solveRateDelta}
          avgPenalty={userStats.avgPenalty}
          avgPenaltyDelta={userStats.avgPenaltyDelta}
          upsolveBacklog={userStats.upsolveBacklog}
          upsolveBacklogDelta={userStats.upsolveBacklogDelta}
          loading={userStats.loading}
        />
      )}

      {/* ── Skill Gap Diagnostics ── */}
      {visibleSections.includes("skillGap") && (
        <>
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
          <SkillGapDiagnostics
            tagStats={userStats.tagStats}
            paceHeatmap={userStats.paceHeatmap}
            loading={userStats.loading}
          />
        </>
      )}

      {/* ── Contest Strategy ── */}
      {visibleSections.includes("contestStrategy") && (
        <>
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
          <ContestStrategy
            whatIf={contestAnalysis.whatIf}
            upsolvePriority={contestAnalysis.upsolvePriority}
            loading={contestAnalysis.loading}
          />
        </>
      )}

      {/* ── Training Roadmap ── */}
      {visibleSections.includes("training") && (
        <>
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
          <TrainingRoadmap
            problems={training.problems}
            loading={training.loading}
          />
        </>
      )}

      {/* ── Extended Insights ── */}
      {visibleSections.includes("extendedInsights") && (
        <>
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
          <ExtendedInsights handle={handle} refreshKey={refreshKey} />
        </>
      )}

      {/* ── Rivalry Board ── */}
      {visibleSections.includes("rivalry") && (
        <>
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
          <RivalryBoard
            handle={handle}
            rivals={rivalry.rivals}
            ratingHistory={rivalry.ratingHistory}
            loading={rivalry.loading}
            rivalHandles={rivalry.rivalHandles}
            addRival={rivalry.addRival}
            removeRival={rivalry.removeRival}
          />
        </>
      )}

      {/* ── System Health ── */}
      {visibleSections.includes("systemHealth") && (
        <>
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
          <SystemHealth
            status={systemHealth.status}
            loading={systemHealth.loading}
          />
        </>
      )}

      {/* Methodology footnote — transparency for the CF audience */}
      <p style={{
        fontSize: 11, color: "var(--text-faint)", marginTop: 8,
        borderTop: "0.5px solid var(--border)", paddingTop: 12,
      }}>
        Computed live from the public Codeforces API (user.info / user.status / user.rating).
        Team submissions (more than one author) are excluded so stats reflect this user&apos;s own
        solves. Tag success rate = accepted ÷ attempted within your current and adjacent rating band.
        Data is cached for 5 minutes; use Refresh to recompute.
      </p>
    </>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}
