"use client";

import { useState, useEffect, useRef } from "react";
import { cfApiFetch } from "./useCFCache";

interface WhatIfData {
  contestName: string;
  contestId: number;
  before: { rank: number; ratingDelta: number; penalty: number };
  after: { rank: number; ratingDelta: number; penalty: number };
}

interface UpsolveProblem {
  contestId: number;
  index: string;
  name: string;
  contestName: string;
  rating: number;
  tags: string[];
  priority: "red" | "amber" | "green";
  distance: number;
}

interface ContestAnalysisResult {
  whatIf: WhatIfData | null;
  upsolvePriority: UpsolveProblem[];
  loading: boolean;
  error: string | null;
}

export function useContestAnalysis(handle: string, userRating: number, refreshKey: number = 0): ContestAnalysisResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatIf, setWhatIf] = useState<WhatIfData | null>(null);
  const [upsolvePriority, setUpsolvePriority] = useState<UpsolveProblem[]>([]);
  const lastKey = useRef(-1);

  useEffect(() => {
    if (!handle || !userRating || lastKey.current === refreshKey) return;
    lastKey.current = refreshKey;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [ratingHistory, submissions] = await Promise.all([
          cfApiFetch<any[]>("user.rating", { handle }),
          cfApiFetch<any[]>("user.status", { handle }),
        ]);

        const sortedRatings = ratingHistory.sort((a: any, b: any) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);

        // --- What-If Simulator ---
        if (sortedRatings.length > 0) {
          const lastContest = sortedRatings[sortedRatings.length - 1];
          const contestSubs = submissions.filter((s: any) => s.contestId === lastContest.contestId);

          // Calculate actual penalty
          const acSubs = contestSubs.filter((s: any) => s.verdict === "OK");
          const actualPenalty = acSubs.reduce((sum: number, s: any) => sum + Math.floor(s.relativeTimeSeconds / 60), 0);

          // Simulate: remove WA penalties on A & B
          const waPenaltyAB = contestSubs
            .filter((s: any) => (s.problem.index === "A" || s.problem.index === "B") && s.verdict === "WRONG_ANSWER")
            .length * 10; // 10 min penalty per WA in ICPC-style

          const simulatedPenalty = Math.max(0, actualPenalty - waPenaltyAB);

          const actualDelta = lastContest.newRating - lastContest.oldRating;
          // Rough estimation: each position improvement ≈ +0.4 rating
          const estimatedRankImprovement = Math.floor(waPenaltyAB / 5);
          const simulatedDelta = Math.round(actualDelta + estimatedRankImprovement * 0.4);

          setWhatIf({
            contestName: lastContest.contestName,
            contestId: lastContest.contestId,
            before: {
              rank: lastContest.rank,
              ratingDelta: actualDelta,
              penalty: actualPenalty,
            },
            after: {
              rank: Math.max(1, lastContest.rank - estimatedRankImprovement),
              ratingDelta: simulatedDelta,
              penalty: simulatedPenalty,
            },
          });
        }

        // --- Upsolve Priority ---
        const last8Rated = sortedRatings.slice(-8);
        const last8Ids = new Set(last8Rated.map((r: any) => r.contestId));
        const contestNameMap = new Map(last8Rated.map((r: any) => [r.contestId, r.contestName]));

        const solvedSet = new Set<string>();
        const attemptedMap = new Map<string, any>();

        for (const s of submissions) {
          const pid = `${s.problem.contestId}-${s.problem.index}`;
          if (s.verdict === "OK") solvedSet.add(pid);
          if (last8Ids.has(s.contestId) && !attemptedMap.has(pid)) {
            attemptedMap.set(pid, s.problem);
          }
        }

        const unsolved: UpsolveProblem[] = [];
        for (const [pid, problem] of attemptedMap) {
          if (solvedSet.has(pid)) continue;
          const distance = Math.abs((problem.rating || 0) - userRating);
          let priority: "red" | "amber" | "green" = "green";
          if (distance <= 150) priority = "red";
          else if (distance <= 300) priority = "amber";

          unsolved.push({
            contestId: problem.contestId,
            index: problem.index,
            name: problem.name,
            contestName: contestNameMap.get(problem.contestId) || `Contest ${problem.contestId}`,
            rating: problem.rating || 0,
            tags: problem.tags || [],
            priority,
            distance,
          });
        }

        unsolved.sort((a, b) => a.distance - b.distance);
        setUpsolvePriority(unsolved.slice(0, 6));
      } catch (err: any) {
        setError(err.message || "Failed to load contest analysis");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [handle, userRating, refreshKey]);

  return { whatIf, upsolvePriority, loading, error };
}
