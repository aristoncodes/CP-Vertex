"use client";

import { useState, useEffect, useRef } from "react";
import { cfApiFetch } from "./useCFCache";

interface WhatIfData {
  contestName: string;
  contestId: number;
  actualRank: number;
  actualDelta: number;
  solvedCount: number;
  totalProblems: number;
  waCount: number;
  tleCount: number;
  // What-if: "if you had 0 WA on easy problems"
  savedMinutes: number;
  estimatedBetterDelta: number;
  estimatedBetterRank: number;
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

        const sortedRatings = ratingHistory.sort(
          (a: any, b: any) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds
        );

        // Only use CONTESTANT submissions for analysis
        const contestantSubs = submissions.filter(
          (s: any) => s.author?.participantType === "CONTESTANT"
        );

        // --- What-If Simulator (last rated contest) ---
        if (sortedRatings.length > 0) {
          const lastContest = sortedRatings[sortedRatings.length - 1];
          const cSubs = contestantSubs.filter((s: any) => s.contestId === lastContest.contestId);

          // Count unique problems attempted and solved
          const attempted = new Set(cSubs.map((s: any) => s.problem.index));
          const solved = new Set(
            cSubs.filter((s: any) => s.verdict === "OK").map((s: any) => s.problem.index)
          );

          // Count WA and TLE
          const waCount = cSubs.filter((s: any) => s.verdict === "WRONG_ANSWER").length;
          const tleCount = cSubs.filter((s: any) => s.verdict === "TIME_LIMIT_EXCEEDED").length;

          // Time wasted on WA before AC on easy problems (A, B, C)
          let savedMinutes = 0;
          for (const idx of ["A", "B", "C"]) {
            const pSubs = cSubs.filter((s: any) => s.problem.index === idx);
            const firstAC = pSubs.find((s: any) => s.verdict === "OK");
            if (firstAC) {
              const waBefore = pSubs.filter(
                (s: any) => s.verdict === "WRONG_ANSWER" && s.relativeTimeSeconds < firstAC.relativeTimeSeconds
              );
              // Each WA costs ~2-3 min of debugging + resubmission
              savedMinutes += waBefore.length * 3;
            }
          }

          const actualDelta = lastContest.newRating - lastContest.oldRating;
          // Conservative estimate: saving N minutes ≈ rank improvement of N/2 positions
          // Each position ≈ 0.3-0.5 rating points
          const rankImprove = Math.floor(savedMinutes / 2);
          const estimatedBetterDelta = Math.round(actualDelta + rankImprove * 0.35);

          setWhatIf({
            contestName: lastContest.contestName,
            contestId: lastContest.contestId,
            actualRank: lastContest.rank,
            actualDelta,
            solvedCount: solved.size,
            totalProblems: attempted.size,
            waCount,
            tleCount,
            savedMinutes,
            estimatedBetterDelta,
            estimatedBetterRank: Math.max(1, lastContest.rank - rankImprove),
          });
        }

        // --- Upsolve Priority ---
        // Problems from last 8 rated contests that user didn't solve
        const last8Rated = sortedRatings.slice(-8);
        const last8Ids = new Set(last8Rated.map((r: any) => r.contestId));
        const contestNameMap = new Map(last8Rated.map((r: any) => [r.contestId, r.contestName]));

        // Track all solved problems (any participantType — includes practice)
        const solvedSet = new Set<string>();
        // Track all problems from rated contests
        const contestProblemMap = new Map<string, any>();

        for (const s of submissions) {
          const pid = `${s.problem.contestId}-${s.problem.index}`;
          if (s.verdict === "OK") solvedSet.add(pid);
          if (last8Ids.has(s.contestId) && !contestProblemMap.has(pid)) {
            contestProblemMap.set(pid, s.problem);
          }
        }

        const unsolved: UpsolveProblem[] = [];
        for (const [pid, problem] of contestProblemMap) {
          if (solvedSet.has(pid)) continue;
          if (!problem.rating) continue; // skip unrated
          const distance = Math.abs(problem.rating - userRating);
          let priority: "red" | "amber" | "green" = "green";
          if (distance <= 150) priority = "red";
          else if (distance <= 300) priority = "amber";

          unsolved.push({
            contestId: problem.contestId,
            index: problem.index,
            name: problem.name,
            contestName: contestNameMap.get(problem.contestId) || `Contest ${problem.contestId}`,
            rating: problem.rating,
            tags: problem.tags || [],
            priority,
            distance,
          });
        }

        unsolved.sort((a, b) => a.distance - b.distance);
        setUpsolvePriority(unsolved.slice(0, 8));
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
