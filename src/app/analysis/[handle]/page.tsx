"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useUserStats } from "@/hooks/useUserStats";
import { useContestAnalysis } from "@/hooks/useContestAnalysis";
import { useTrainingRecommendations } from "@/hooks/useTrainingRecommendations";
import { useRivalry } from "@/hooks/useRivalry";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { clearCFCache, getLastFetchTime } from "@/hooks/useCFCache";

import { MetricRow } from "@/components/analysis/MetricRow";
import { SkillGapDiagnostics } from "@/components/analysis/SkillGapDiagnostics";
import { ContestStrategy } from "@/components/analysis/ContestStrategy";
import { TrainingRoadmap } from "@/components/analysis/TrainingRoadmap";
import { RivalryBoard } from "@/components/analysis/RivalryBoard";
import { SystemHealth } from "@/components/analysis/SystemHealth";

const TABS = ["Overview", "Diagnose", "Strategy", "Train"] as const;
type Tab = (typeof TABS)[number];

const TAB_SECTIONS: Record<Tab, string[]> = {
  Overview: ["metrics", "skillGap", "contestStrategy", "training", "rivalry", "systemHealth"],
  Diagnose: ["metrics", "skillGap"],
  Strategy: ["contestStrategy"],
  Train: ["training", "rivalry"],
};

export default function AnalysisPage() {
  const params = useParams();
  const handle = params.handle as string;
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [tickCount, setTickCount] = useState(0);

  // Determine if viewing own profile
  const userCfHandle = session?.user?.cfHandle;
  const isOwnProfile = userCfHandle?.toLowerCase() === handle?.toLowerCase();

  const userStats = useUserStats(handle, refreshKey);
  const contestAnalysis = useContestAnalysis(handle, userStats.rating, refreshKey);
  const training = useTrainingRecommendations(handle, userStats.rating, userStats.weakestTags, userStats.solvedProblemIds);
  const rivalry = useRivalry(handle, refreshKey);
  const systemHealth = useSystemHealth();

  // Derive last-updated label from cache timestamp (no setState in effect)
  const lastUpdated = (() => {
    // tickCount is just to force re-derive every 30s
    void tickCount;
    if (userStats.loading || !handle) return null;
    const ts = getLastFetchTime(handle);
    return ts ? formatTimeAgo(ts) : null;
  })();

  // Tick every 30s to refresh the "time ago" label
  useEffect(() => {
    const interval = setInterval(() => setTickCount(c => c + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    clearCFCache();
    setRefreshKey(k => k + 1);
  }, []);

  const visibleSections = TAB_SECTIONS[activeTab];
  const initials = handle.slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      {/* ── Top Bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 4, flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
              background: "linear-gradient(135deg, #5B4FD4, #7c6ff7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 500, color: "#fff",
            }}>
              {initials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{handle}</span>
            {isOwnProfile && (
              <span style={{ fontSize: 10, color: "#5B4FD4", fontWeight: 500 }}>you</span>
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
              onMouseEnter={e => { if (!userStats.loading) { e.currentTarget.style.borderColor = "#5B4FD4"; e.currentTarget.style.background = "var(--surface-low)"; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface-card)"; }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: 16, color: "var(--text-muted)",
                animation: userStats.loading ? "spin 1s linear infinite" : "none",
              }}>refresh</span>
            </button>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{
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

      {/* ── Rivalry Board ── */}
      {visibleSections.includes("rivalry") && (
        <>
          <div style={{ borderTop: "0.5px solid var(--border)", margin: "4px 0" }} />
          <RivalryBoard
            handle={handle}
            rivals={rivalry.rivals}
            ratingHistory={rivalry.ratingHistory}
            loading={rivalry.loading}
            friendHandles={rivalry.friendHandles}
            setFriendHandles={rivalry.setFriendHandles}
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
    </DashboardLayout>
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
