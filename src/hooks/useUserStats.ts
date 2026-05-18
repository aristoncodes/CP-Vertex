"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { cfApiFetch } from "./useCFCache";

interface TagStat {
  tag: string;
  successRate: number;
  total: number;
  accepted: number;
  badge: "strong" | "ok" | "weak";
  lowerBandRate?: number;
  currentBandRate?: number;
  lowerBand?: string;
  currentBand?: string;
}

interface PaceHeatmapRow {
  contestId: number;
  contestName: string;
  cells: Record<string, { time: number | null; waCount: number; tleCount: number }>;
}

interface UserStatsResult {
  rating: number;
  ratingDelta: number;
  solveRate: number;
  solveRateDelta: number;
  avgPenalty: number;
  avgPenaltyDelta: number;
  upsolveBacklog: number;
  upsolveBacklogDelta: number;
  tagStats: TagStat[];
  paceHeatmap: PaceHeatmapRow[];
  weakestTags: string[];
  solvedProblemIds: Set<string>;
  loading: boolean;
  error: string | null;
}

function getRatingBand(rating: number): [number, number] {
  const base = Math.floor(rating / 200) * 200;
  return [base, base + 200];
}

export function useUserStats(handle: string, refreshKey: number = 0): UserStatsResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Omit<UserStatsResult, "loading" | "error">>({
    rating: 0, ratingDelta: 0, solveRate: 0, solveRateDelta: 0,
    avgPenalty: 0, avgPenaltyDelta: 0, upsolveBacklog: 0, upsolveBacklogDelta: 0,
    tagStats: [], paceHeatmap: [], weakestTags: [], solvedProblemIds: new Set(),
  });
  const lastKey = useRef(-1);

  useEffect(() => {
    if (!handle || lastKey.current === refreshKey) return;
    lastKey.current = refreshKey;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user info, submissions, and rating history in parallel
        const [userInfo, submissions, ratingHistory] = await Promise.all([
          cfApiFetch<any[]>("user.info", { handles: handle }),
          cfApiFetch<any[]>("user.status", { handle }),
          cfApiFetch<any[]>("user.rating", { handle }),
        ]);

        const currentRating = userInfo[0]?.rating || 0;
        const [bandLow, bandHigh] = getRatingBand(currentRating);
        const lowerBandLow = bandLow - 200;
        const lowerBandHigh = bandLow;

        // --- Rating Delta ---
        const sortedRatings = ratingHistory.sort((a: any, b: any) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
        const lastRating = sortedRatings.length >= 2 ? sortedRatings[sortedRatings.length - 2].newRating : currentRating;
        const ratingDelta = currentRating - lastRating;

        // --- Solve Rate (last 60 days) ---
        const now = Math.floor(Date.now() / 1000);
        const sixtyDaysAgo = now - 60 * 24 * 3600;
        const thirtyDaysAgo = now - 30 * 24 * 3600;
        const recent60 = submissions.filter((s: any) => s.creationTimeSeconds >= sixtyDaysAgo);
        const recent30 = submissions.filter((s: any) => s.creationTimeSeconds >= thirtyDaysAgo && s.creationTimeSeconds < sixtyDaysAgo + 30 * 24 * 3600);
        const ac60 = recent60.filter((s: any) => s.verdict === "OK").length;
        const total60 = recent60.length || 1;
        const solveRate = Math.round((ac60 / total60) * 100);

        const acPrev = recent30.filter((s: any) => s.verdict === "OK").length;
        const totalPrev = recent30.length || 1;
        const solveRatePrev = Math.round((acPrev / totalPrev) * 100);
        const solveRateDelta = solveRate - solveRatePrev;

        // --- Rated contests for pace heatmap + penalty ---
        const ratedContestIds = new Set(ratingHistory.map((r: any) => r.contestId));
        const recentRated = sortedRatings.slice(-10);
        const last5Rated = sortedRatings.slice(-5);
        const prev5Rated = sortedRatings.slice(-10, -5);

        // Average penalty calculation — only CONTESTANT submissions, capped at 5h
        const calcAvgPenalty = (contests: any[]) => {
          if (contests.length === 0) return 0;
          let totalPenalty = 0;
          let count = 0;
          for (const c of contests) {
            const contestSubs = submissions.filter((s: any) =>
              s.contestId === c.contestId &&
              s.author?.participantType === "CONTESTANT"
            );
            const penalties = contestSubs
              .filter((s: any) => s.verdict === "OK")
              .map((s: any) => Math.floor(s.relativeTimeSeconds / 60))
              .filter((mins: number) => mins <= 300); // cap at 5h
            if (penalties.length > 0) {
              totalPenalty += penalties.reduce((a: number, b: number) => a + b, 0) / penalties.length;
              count++;
            }
          }
          return count > 0 ? Math.round(totalPenalty / count) : 0;
        };

        const avgPenalty = calcAvgPenalty(last5Rated);
        const avgPenaltyPrev = calcAvgPenalty(prev5Rated);
        const avgPenaltyDelta = avgPenaltyPrev ? avgPenalty - avgPenaltyPrev : 0;

        // --- Upsolve backlog ---
        const solvedIds = new Set<string>();
        const attemptedIds = new Set<string>();
        for (const s of submissions) {
          const pid = `${s.problem.contestId}-${s.problem.index}`;
          if (s.verdict === "OK") solvedIds.add(pid);
          if (ratedContestIds.has(s.contestId)) attemptedIds.add(pid);
        }
        const upsolveBacklog = [...attemptedIds].filter(id => !solvedIds.has(id)).length;

        // --- Tag Stats ---
        const tagMap: Record<string, { total: number; ac: number; totalLower: number; acLower: number }> = {};
        for (const s of submissions) {
          const pr = s.problem?.rating || 0;
          const isCurrentBand = pr >= bandLow && pr < bandHigh;
          const isLowerBand = pr >= lowerBandLow && pr < lowerBandHigh;
          if (!isCurrentBand && !isLowerBand) continue;
          for (const tag of (s.problem?.tags || [])) {
            if (!tagMap[tag]) tagMap[tag] = { total: 0, ac: 0, totalLower: 0, acLower: 0 };
            if (isCurrentBand) {
              tagMap[tag].total++;
              if (s.verdict === "OK") tagMap[tag].ac++;
            }
            if (isLowerBand) {
              tagMap[tag].totalLower++;
              if (s.verdict === "OK") tagMap[tag].acLower++;
            }
          }
        }

        const tagStats: TagStat[] = Object.entries(tagMap)
          .filter(([, v]) => v.total >= 2)
          .map(([tag, v]) => {
            const successRate = v.total > 0 ? Math.round((v.ac / v.total) * 100) : 0;
            const lowerRate = v.totalLower > 0 ? Math.round((v.acLower / v.totalLower) * 100) : null;
            return {
              tag,
              successRate,
              total: v.total,
              accepted: v.ac,
              badge: (successRate >= 70 ? "strong" : successRate >= 40 ? "ok" : "weak") as "strong" | "ok" | "weak",
              lowerBandRate: lowerRate ?? undefined,
              currentBandRate: successRate,
              lowerBand: `${lowerBandLow}–${lowerBandHigh}`,
              currentBand: `${bandLow}–${bandHigh}`,
            };
          })
          .sort((a, b) => a.successRate - b.successRate);

        const weakestTags = tagStats.slice(0, 2).map(t => t.tag);

        // --- Pace Heatmap ---
        const last3Rated = sortedRatings.slice(-3);
        const paceHeatmap: PaceHeatmapRow[] = last3Rated.map((rEntry: any) => {
          const contestSubs = submissions.filter((s: any) => s.contestId === rEntry.contestId);
          const cells: Record<string, { time: number | null; waCount: number; tleCount: number }> = {};
          const problems = new Set(contestSubs.map((s: any) => s.problem.index));

          for (const idx of ["A", "B", "C", "D", "E", "F"]) {
            const probSubs = contestSubs.filter((s: any) => s.problem.index === idx);
            if (probSubs.length === 0) {
              cells[idx] = { time: null, waCount: 0, tleCount: 0 };
              continue;
            }
            const firstAC = probSubs.find((s: any) => s.verdict === "OK");
            cells[idx] = {
              time: firstAC ? Math.floor(firstAC.relativeTimeSeconds / 60) : null,
              waCount: probSubs.filter((s: any) => s.verdict === "WRONG_ANSWER").length,
              tleCount: probSubs.filter((s: any) => s.verdict === "TIME_LIMIT_EXCEEDED").length,
            };
          }

          // WA and TLE columns
          const totalWA = Object.values(cells).reduce((s, c) => s + c.waCount, 0);
          const totalTLE = Object.values(cells).reduce((s, c) => s + c.tleCount, 0);
          cells["WA"] = { time: totalWA || null, waCount: totalWA, tleCount: 0 };
          cells["TLE"] = { time: totalTLE || null, waCount: 0, tleCount: totalTLE };

          return {
            contestId: rEntry.contestId,
            contestName: rEntry.contestName,
            cells,
          };
        });

        setData({
          rating: currentRating, ratingDelta,
          solveRate, solveRateDelta,
          avgPenalty, avgPenaltyDelta,
          upsolveBacklog, upsolveBacklogDelta: 0,
          tagStats, paceHeatmap,
          weakestTags,
          solvedProblemIds: solvedIds,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load user stats");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [handle, refreshKey]);

  return { ...data, loading, error };
}
