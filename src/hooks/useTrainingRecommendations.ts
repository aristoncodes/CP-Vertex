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
        const tagParams = weakestTags.slice(0, 2).join(";");
        const result = await cfApiFetch<{ problems: any[]; problemStatistics: any[] }>(
          "problemset.problems", { tags: tagParams }
        );
        const minR = userRating - 100, maxR = userRating + 200;
        const solveMap = new Map<string, number>();
        for (const s of result.problemStatistics) solveMap.set(`${s.contestId}-${s.index}`, s.solvedCount || 0);
        const candidates = result.problems
          .filter((p: any) => p.rating && p.rating >= minR && p.rating <= maxR && !solvedProblemIds.has(`${p.contestId}-${p.index}`))
          .map((p: any) => ({
            contestId: p.contestId, index: p.index, name: p.name, rating: p.rating,
            tags: p.tags, solvedCount: solveMap.get(`${p.contestId}-${p.index}`) || 0,
            weakTag: p.tags.find((t: string) => weakestTags.includes(t)) || weakestTags[0],
          }));
        candidates.sort((a: TrainingProblem, b: TrainingProblem) => Math.abs(a.rating - userRating) - Math.abs(b.rating - userRating));
        setProblems(candidates.slice(0, 4));
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };
    fetchData();
  }, [handle, userRating, weakestTags, solvedProblemIds]);

  return { problems, loading, error };
}
