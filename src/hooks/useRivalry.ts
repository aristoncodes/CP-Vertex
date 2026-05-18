"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { cfApiFetch } from "./useCFCache";

interface RivalEntry {
  handle: string; rating: number; maxRating: number; initials: string;
  wins: number; losses: number; total: number;
}
interface RatingEntry {
  contestId: number; contestName: string; rank: number; delta: number;
  date: string;
}

const RIVALS_STORAGE_KEY = "cpv:analysis:rivals";

function loadSavedRivals(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RIVALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRivals(handles: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RIVALS_STORAGE_KEY, JSON.stringify(handles));
  } catch { /* ignore */ }
}

export function useRivalry(handle: string, refreshKey: number = 0) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rivals, setRivals] = useState<RivalEntry[]>([]);
  const [ratingHistory, setRatingHistory] = useState<RatingEntry[]>([]);
  const [rivalHandles, setRivalHandles] = useState<string[]>([]);
  const lastKey = useRef(-1);
  const initDone = useRef(false);

  // Load saved rivals from localStorage on first mount
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    const saved = loadSavedRivals();
    if (saved.length > 0) {
      setRivalHandles(saved);
    }
  }, []);

  // Fetch user's own recent rating history
  useEffect(() => {
    if (!handle || lastKey.current === refreshKey) return;
    lastKey.current = refreshKey;
    const fetchData = async () => {
      try {
        setLoading(true);
        const ratings = await cfApiFetch<any[]>("user.rating", { handle });
        const sorted = ratings.sort((a: any, b: any) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
        setRatingHistory(sorted.slice(-6).reverse().map((r: any) => ({
          contestId: r.contestId,
          contestName: r.contestName,
          rank: r.rank,
          delta: r.newRating - r.oldRating,
          date: new Date(r.ratingUpdateTimeSeconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        })));
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };
    fetchData();
  }, [handle, refreshKey]);

  // Fetch rival comparison data when list changes
  useEffect(() => {
    if (!handle || rivalHandles.length === 0) {
      setRivals([]);
      return;
    }
    const fetchRivals = async () => {
      try {
        const allHandles = [handle, ...rivalHandles];
        const infos = await cfApiFetch<any[]>("user.info", { handles: allHandles.join(";") });
        const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 3600;

        const userRatings = await cfApiFetch<any[]>("user.rating", { handle });
        const userContestRanks = new Map<number, number>();
        for (const r of userRatings) {
          if (r.ratingUpdateTimeSeconds >= ninetyDaysAgo) userContestRanks.set(r.contestId, r.rank);
        }

        const rivalData: RivalEntry[] = [];
        for (const h of rivalHandles) {
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
              handle: info.handle,
              rating: info.rating || 0,
              maxRating: info.maxRating || 0,
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
  }, [rivalHandles, handle]);

  const addRival = useCallback((newHandle: string) => {
    const trimmed = newHandle.trim();
    if (!trimmed) return;
    // Don't add yourself or duplicates
    if (trimmed.toLowerCase() === handle.toLowerCase()) return;
    if (rivalHandles.some(h => h.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = [...rivalHandles, trimmed];
    setRivalHandles(updated);
    saveRivals(updated);
  }, [rivalHandles, handle]);

  const removeRival = useCallback((removeHandle: string) => {
    const updated = rivalHandles.filter(h => h.toLowerCase() !== removeHandle.toLowerCase());
    setRivalHandles(updated);
    saveRivals(updated);
  }, [rivalHandles]);

  return { rivals, ratingHistory, loading, error, rivalHandles, addRival, removeRival };
}
