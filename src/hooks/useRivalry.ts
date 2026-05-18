"use client";
import { useState, useEffect, useRef } from "react";
import { cfApiFetch } from "./useCFCache";

interface RivalEntry {
  handle: string; rating: number; initials: string;
  wins: number; losses: number; total: number;
}
interface RatingEntry {
  contestId: number; contestName: string; rank: number; delta: number;
}

export function useRivalry(handle: string, refreshKey: number = 0) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rivals, setRivals] = useState<RivalEntry[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingEntry[]>([]);
  const [friendHandles, setFriendHandles] = useState("");
  const lastKey = useRef(-1);

  useEffect(() => {
    if (!handle || lastKey.current === refreshKey) return;
    lastKey.current = refreshKey;
    const fetchData = async () => {
      try {
        setLoading(true);
        const ratings = await cfApiFetch<any[]>("user.rating", { handle });
        const sorted = ratings.sort((a: any, b: any) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
        setRatingHistory(sorted.slice(-4).reverse().map((r: any) => ({
          contestId: r.contestId, contestName: r.contestName, rank: r.rank,
          delta: r.newRating - r.oldRating,
        })));
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };
    fetchData();
  }, [handle, refreshKey]);

  // Fetch rivals when friendHandles changes
  useEffect(() => {
    if (!friendHandles.trim() || !handle) return;
    const handles = friendHandles.split(",").map(h => h.trim()).filter(Boolean);
    if (handles.length === 0) return;
    const fetchRivals = async () => {
      try {
        const allHandles = [handle, ...handles];
        const infos = await cfApiFetch<any[]>("user.info", { handles: allHandles.join(";") });
        const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 3600;
        // Get user's ratings to find shared contests
        const userRatings = await cfApiFetch<any[]>("user.rating", { handle });
        const userContestRanks = new Map<number, number>();
        for (const r of userRatings) {
          if (r.ratingUpdateTimeSeconds >= ninetyDaysAgo) userContestRanks.set(r.contestId, r.rank);
        }
        const rivalData: RivalEntry[] = [];
        for (const h of handles) {
          const info = infos.find((i: any) => i.handle.toLowerCase() === h.toLowerCase());
          if (!info) continue;
          try {
            const friendRatings = await cfApiFetch<any[]>("user.rating", { handle: h });
            let wins = 0, losses = 0, total = 0;
            for (const fr of friendRatings) {
              if (fr.ratingUpdateTimeSeconds >= ninetyDaysAgo && userContestRanks.has(fr.contestId)) {
                total++;
                const userRank = userContestRanks.get(fr.contestId)!;
                if (userRank < fr.rank) wins++;
                else if (userRank > fr.rank) losses++;
              }
            }
            rivalData.push({
              handle: info.handle, rating: info.rating || 0,
              initials: info.handle.slice(0, 2).toUpperCase(),
              wins, losses, total,
            });
          } catch { /* skip */ }
        }
        rivalData.sort((a, b) => b.rating - a.rating);
        setRivals(rivalData);
      } catch { /* ignore */ }
    };
    fetchRivals();
  }, [friendHandles, handle]);

  return { rivals, ratingHistory, loading, error, friendHandles, setFriendHandles };
}
