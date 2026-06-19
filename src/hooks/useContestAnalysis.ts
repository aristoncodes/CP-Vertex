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

/**
 * Computes what-if analysis by fetching real contest standings + rating changes.
 *
 * Approach:
 * 1. Get the user's last rated contest
 * 2. Count WAs on A/B/C before AC, calculate real time wasted
 * 3. Fetch contest.standings → find user's actual penalty, then simulate
 *    what their rank would be with reduced penalty
 * 4. Fetch contest.ratingChanges → map rank → delta, interpolate new delta
 */
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
          const contestId = lastContest.contestId;
          const cSubs = contestantSubs.filter((s: any) => s.contestId === contestId);

          // Count unique problems attempted and solved
          const solved = new Set(
            cSubs.filter((s: any) => s.verdict === "OK").map((s: any) => s.problem.index)
          );
          const attempted = new Set(cSubs.map((s: any) => s.problem.index));
          const waCount = cSubs.filter((s: any) => s.verdict === "WRONG_ANSWER").length;
          const tleCount = cSubs.filter((s: any) => s.verdict === "TIME_LIMIT_EXCEEDED").length;

          // Calculate real time wasted on WA before AC on easy problems (A, B, C)
          // We use actual submission timestamps, not guesses
          let savedSeconds = 0;
          let easyWACount = 0;
          for (const idx of ["A", "B", "C"]) {
            const pSubs = cSubs
              .filter((s: any) => s.problem.index === idx)
              .sort((a: any, b: any) => a.relativeTimeSeconds - b.relativeTimeSeconds);

            const firstAC = pSubs.find((s: any) => s.verdict === "OK");
            if (firstAC) {
              const wasBefore = pSubs.filter(
                (s: any) => s.verdict === "WRONG_ANSWER" && s.relativeTimeSeconds < firstAC.relativeTimeSeconds
              );
              easyWACount += wasBefore.length;
              if (wasBefore.length > 0) {
                // Time between first WA and AC = time wasted debugging
                const firstWATime = wasBefore[0].relativeTimeSeconds;
                const acTime = firstAC.relativeTimeSeconds;
                savedSeconds += (acTime - firstWATime);
              }
            }
          }

          const savedMinutes = Math.round(savedSeconds / 60);
          const actualDelta = lastContest.newRating - lastContest.oldRating;

          // Now fetch REAL standings + rating changes to find the improved rank
          let estimatedBetterRank = lastContest.rank;
          let estimatedBetterDelta = actualDelta;

          if (easyWACount > 0) {
            try {
              // Fetch standings and rating changes in parallel
              const [standingsRes, ratingChanges] = await Promise.all([
                cfApiFetch<any>("contest.standings", {
                  contestId: String(contestId),
                  showUnofficial: "false",
                }),
                cfApiFetch<any[]>("contest.ratingChanges", {
                  contestId: String(contestId),
                }),
              ]);

              const rows = standingsRes.rows || [];
              const contestType: string = standingsRes.contest?.type || "CF"; // "CF" or "ICPC"

              // Find user's row in standings
              const userRow = rows.find((r: any) =>
                r.party?.members?.some((m: any) =>
                  m.handle.toLowerCase() === handle.toLowerCase()
                )
              );

              if (userRow) {
                if (contestType === "ICPC") {
                  // ═══ ICPC-style (Div 3, Div 4, Educational) ═══
                  // Penalty = sum(solve_time_minutes) + 10 * total_WA_before_AC
                  // Rank by: most problems solved → lowest penalty
                  //
                  // If we remove WAs on A/B/C:
                  //   - Save 20 min per WA (penalty reduction)
                  //   - Save debugging time (earlier AC = lower solve time)
                  const WA_PENALTY_MINUTES = 20;
                  const penaltyReduction = easyWACount * WA_PENALTY_MINUTES + Math.round(savedSeconds / 60);
                  const simulatedPenalty = Math.max(0, userRow.penalty - penaltyReduction);
                  const userSolvedCount = solved.size;

                  let betterCount = 0;
                  for (const row of rows) {
                    if (row === userRow) continue;
                    const rowSolved = row.problemResults?.filter(
                      (pr: any) => pr.points > 0
                    ).length || 0;

                    if (rowSolved > userSolvedCount) {
                      betterCount++; // More problems solved → ranked higher
                    } else if (rowSolved === userSolvedCount && row.penalty < simulatedPenalty) {
                      betterCount++; // Same problems, lower penalty → ranked higher
                    }
                  }
                  estimatedBetterRank = betterCount + 1;

                } else {
                  // ═══ CF/Score-style (Div 1, Div 2, Div 1+2, Global) ═══
                  // Score = sum(problem_points) where each problem's max decreases over time
                  // Each WA before AC costs -50 points
                  // Rank by: highest score → earliest last AC time (tiebreaker)
                  //
                  // If we remove WAs on A/B/C:
                  //   - Gain 50 points per WA removed
                  //   - Earlier AC → problem's time-decay gives MORE points
                  const WA_POINT_PENALTY = 50;
                  const scoreBonus = easyWACount * WA_POINT_PENALTY;

                  // Also estimate time-decay bonus: earlier submission = more points
                  // CF formula: max(3p/10, p - p/250 * t - 50*WA) where t = minutes
                  // Simplified: each saved minute ≈ p/250 points (for a ~1000-point problem ≈ 4 pts/min)
                  let timeDecayBonus = 0;
                  for (const idx of ["A", "B", "C"]) {
                    const pSubs = cSubs
                      .filter((s: any) => s.problem.index === idx)
                      .sort((a: any, b: any) => a.relativeTimeSeconds - b.relativeTimeSeconds);
                    const firstAC = pSubs.find((s: any) => s.verdict === "OK");
                    if (firstAC) {
                      const wasBefore = pSubs.filter(
                        (s: any) => s.verdict === "WRONG_ANSWER" && s.relativeTimeSeconds < firstAC.relativeTimeSeconds
                      );
                      if (wasBefore.length > 0) {
                        const timeSavedMin = (firstAC.relativeTimeSeconds - wasBefore[0].relativeTimeSeconds) / 60;
                        // Approximate max points for the problem from its index
                        const maxPoints = firstAC.problem?.points || (idx === "A" ? 500 : idx === "B" ? 1000 : 1500);
                        timeDecayBonus += Math.round((maxPoints / 250) * timeSavedMin);
                      }
                    }
                  }

                  const simulatedScore = userRow.penalty + scoreBonus + timeDecayBonus;
                  // In CF-style, penalty field = total score (higher is better)

                  let betterCount = 0;
                  for (const row of rows) {
                    if (row === userRow) continue;
                    if (row.penalty > simulatedScore) {
                      betterCount++; // Higher score → ranked higher
                    } else if (row.penalty === simulatedScore) {
                      // Tiebreaker: earlier last successful submission
                      // We don't simulate this precisely, so count as tied (they stay ahead)
                      betterCount++;
                    }
                  }
                  estimatedBetterRank = betterCount + 1;
                }

                // Interpolate rating delta from real rating changes at the new rank
                if (ratingChanges && ratingChanges.length > 0) {
                  const rankDeltaMap = ratingChanges
                    .map((rc: any) => ({ rank: rc.rank, delta: rc.newRating - rc.oldRating }))
                    .sort((a: any, b: any) => a.rank - b.rank);

                  estimatedBetterDelta = interpolateDelta(rankDeltaMap, estimatedBetterRank, lastContest.oldRating, ratingChanges);
                }
              }
            } catch {
              // If standings fetch fails, fall back to heuristic
              const rankImprove = Math.max(1, Math.floor(savedMinutes * 1.5));
              estimatedBetterRank = Math.max(1, lastContest.rank - rankImprove);
              estimatedBetterDelta = actualDelta + Math.round(rankImprove * 0.4);
            }
          }

          setWhatIf({
            contestName: lastContest.contestName,
            contestId,
            actualRank: lastContest.rank,
            actualDelta,
            solvedCount: solved.size,
            totalProblems: attempted.size,
            waCount,
            tleCount,
            savedMinutes,
            estimatedBetterDelta,
            estimatedBetterRank,
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

/**
 * Interpolate rating delta for a given rank using real contest rating changes.
 * 
 * Strategy: find nearby participants with similar oldRating at ranks close to
 * the target rank, and use their delta as the estimate.
 */
function interpolateDelta(
  rankDeltaMap: { rank: number; delta: number }[],
  targetRank: number,
  userOldRating: number,
  ratingChanges: any[]
): number {
  // First, try to find participants near the target rank with similar rating
  // This accounts for the fact that delta depends on both rank AND starting rating
  const nearbyByRank = ratingChanges
    .filter((rc: any) => Math.abs(rc.rank - targetRank) <= 30)
    .sort((a: any, b: any) =>
      Math.abs(a.oldRating - userOldRating) - Math.abs(b.oldRating - userOldRating)
    );

  // If we find participants near that rank with similar rating, use their delta
  if (nearbyByRank.length > 0) {
    // Weight by similarity in both rank and rating
    const top = nearbyByRank.slice(0, 5);
    let weightedSum = 0;
    let weightSum = 0;
    for (const rc of top) {
      const rankDist = Math.abs(rc.rank - targetRank) + 1;
      const ratingDist = Math.abs(rc.oldRating - userOldRating) + 1;
      const weight = 1 / (rankDist * 0.5 + ratingDist * 0.01);
      weightedSum += (rc.newRating - rc.oldRating) * weight;
      weightSum += weight;
    }
    return Math.round(weightedSum / weightSum);
  }

  // Fallback: simple linear interpolation from rank-delta curve
  if (rankDeltaMap.length === 0) return 0;

  // Find surrounding ranks
  let lower = rankDeltaMap[0];
  let upper = rankDeltaMap[rankDeltaMap.length - 1];

  for (let i = 0; i < rankDeltaMap.length - 1; i++) {
    if (rankDeltaMap[i].rank <= targetRank && rankDeltaMap[i + 1].rank >= targetRank) {
      lower = rankDeltaMap[i];
      upper = rankDeltaMap[i + 1];
      break;
    }
  }

  if (lower.rank === upper.rank) return lower.delta;

  // Linear interpolation
  const t = (targetRank - lower.rank) / (upper.rank - lower.rank);
  return Math.round(lower.delta + t * (upper.delta - lower.delta));
}
