"use client";
import { useState, useEffect, useRef } from "react";
import { cfApiFetch } from "./useCFCache";

interface TrainingProblem {
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  solvedCount: number;
  weakTag: string;
  url: string;
}

export function useTrainingRecommendations(
  handle: string, userRating: number, weakestTags: string[], solvedProblemIds: Set<string>
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<TrainingProblem[]>([]);
  const lastTagsKey = useRef("");

  useEffect(() => {
    if (!handle || !userRating || weakestTags.length === 0) return;
    const tagsKey = weakestTags.join(",");
    if (tagsKey === lastTagsKey.current) return;
    lastTagsKey.current = tagsKey;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch problems for each weak tag separately for better results
        const allCandidates: TrainingProblem[] = [];
        const minR = userRating - 100;
        const maxR = userRating + 300;

        for (const tag of weakestTags.slice(0, 2)) {
          try {
            const result = await cfApiFetch<{ problems: any[]; problemStatistics: any[] }>(
              "problemset.problems", { tags: tag }
            );

            const solveMap = new Map<string, number>();
            for (const s of result.problemStatistics) {
              solveMap.set(`${s.contestId}-${s.index}`, s.solvedCount || 0);
            }

            const tagProblems = result.problems
              .filter((p: any) =>
                p.rating && p.rating >= minR && p.rating <= maxR &&
                !solvedProblemIds.has(`${p.contestId}-${p.index}`) &&
                p.contestId > 0 // exclude gym
              )
              .map((p: any) => ({
                contestId: p.contestId,
                index: p.index,
                name: p.name,
                rating: p.rating,
                tags: p.tags,
                solvedCount: solveMap.get(`${p.contestId}-${p.index}`) || 0,
                weakTag: tag,
                url: `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`,
              }));

            // Pick the 3 best per tag — closest to user rating, with decent solve count
            tagProblems.sort((a: TrainingProblem, b: TrainingProblem) => {
              const distA = Math.abs(a.rating - userRating);
              const distB = Math.abs(b.rating - userRating);
              return distA - distB;
            });
            allCandidates.push(...tagProblems.slice(0, 3));
          } catch {
            // Skip failed tag fetch
          }
        }

        // Deduplicate by problem ID
        const seen = new Set<string>();
        const deduped = allCandidates.filter(p => {
          const key = `${p.contestId}-${p.index}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setProblems(deduped.slice(0, 4));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [handle, userRating, weakestTags, solvedProblemIds]);

  return { problems, loading, error };
}
