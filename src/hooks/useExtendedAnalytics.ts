/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { cfApiFetch } from "./useCFCache";

interface ExtendedAnalyticsResult {
  // 1. Rating Trajectory
  ratingHistory: { date: string; rating: number; name: string }[];
  trendLine: { date: string; expectedRating: number }[];
  
  // 2. Consistency & Streak
  consistencyScore: number; // 0-100
  longestGreenStreak: number;
  currentGreenStreak: number;
  
  // 3. Activity Calendar (last 365 days)
  activityCalendar: { date: string; count: number }[];
  
  // 4. Language Stats
  languageStats: { language: string; count: number; percentage: number }[];
  
  // 5. Time of Day Performance (0-23 hours)
  timeOfDayStats: { hour: number; ratingDelta: number; contestCount: number }[];
  
  // 6. Division Breakdown
  divisionStats: { div: string; contests: number; avgDelta: number; winRate: number }[];
  
  // 7. Problem Difficulty Ceiling
  difficultyCeiling: { tag: string; maxRating: number }[];
  
  // 8. Virtual Contests
  virtualContests: { id: number; name: string; solved: number; penalty: number }[];
  
  // 9. Solve Time Distribution (minutes)
  solveTimeDist: { label: string; count: number }[];
  
  // 10. Weakness Heatmap (Difficulty x Tag)
  weaknessHeatmap: { tag: string; ratings: Record<number, { total: number; ac: number; rate: number }> }[];

  loading: boolean;
  error: string | null;
}

export function useExtendedAnalytics(handle: string, refreshKey: number = 0): ExtendedAnalyticsResult {
  const [data, setData] = useState<Omit<ExtendedAnalyticsResult, "loading" | "error">>({
    ratingHistory: [], trendLine: [],
    consistencyScore: 0, longestGreenStreak: 0, currentGreenStreak: 0,
    activityCalendar: [], languageStats: [], timeOfDayStats: [],
    divisionStats: [], difficultyCeiling: [], virtualContests: [],
    solveTimeDist: [], weaknessHeatmap: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastKey = useRef(-1);

  useEffect(() => {
    if (!handle || lastKey.current === refreshKey) return;
    lastKey.current = refreshKey;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [ratingHistory, submissions] = await Promise.all([
          cfApiFetch<any[]>("user.rating", { handle }),
          cfApiFetch<any[]>("user.status", { handle }),
        ]);

        const sortedRatings = ratingHistory.sort((a: any, b: any) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
        const acSubs = submissions.filter((s: any) => s.verdict === "OK");

        // 1. Rating Trajectory
        const history = sortedRatings.map((r: any) => ({
          date: new Date(r.ratingUpdateTimeSeconds * 1000).toISOString().split('T')[0],
          rating: r.newRating,
          name: r.contestName
        }));

        // Simple linear regression for trend
        let trend: { date: string; expectedRating: number }[] = [];
        if (history.length > 1) {
          const n = history.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
          history.forEach((h: any, i: number) => {
            sumX += i; sumY += h.rating; sumXY += i * h.rating; sumX2 += i * i;
          });
          const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
          const intercept = (sumY - slope * sumX) / n;
          trend = history.map((h: any, i: number) => ({
            date: h.date,
            expectedRating: Math.round(intercept + slope * i)
          }));
        }

        // 2. Consistency Score & Streaks
        let currentStreak = 0, maxStreak = 0;
        let positiveContests = 0;
        sortedRatings.forEach((r: any) => {
          const delta = r.newRating - r.oldRating;
          if (delta >= 0) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
            positiveContests++;
          } else {
            currentStreak = 0;
          }
        });
        const consistencyScore = sortedRatings.length > 0 ? Math.round((positiveContests / sortedRatings.length) * 100) : 0;

        // 3. Activity Calendar (Last 365 Days)
        const activityMap = new Map<string, number>();
        const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 3600;
        submissions.forEach((s: any) => {
          if (s.creationTimeSeconds >= oneYearAgo) {
            const d = new Date(s.creationTimeSeconds * 1000).toISOString().split('T')[0];
            activityMap.set(d, (activityMap.get(d) || 0) + 1);
          }
        });
        const activityCal = Array.from(activityMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

        // 4. Language Stats
        const langCount = new Map<string, number>();
        acSubs.forEach((s: any) => {
          // Normalize language names roughly
          const lang = s.programmingLanguage.replace(/[0-9]+/, '').trim().split(' ')[0];
          langCount.set(lang, (langCount.get(lang) || 0) + 1);
        });
        const languageStats = Array.from(langCount.entries())
          .map(([language, count]) => ({ language, count, percentage: Math.round((count / acSubs.length) * 100) }))
          .sort((a, b) => b.count - a.count);

        // 5. Time of Day Performance
        const timeOfDayMap = new Map<number, { deltaSum: number; count: number }>();
        sortedRatings.forEach((r: any) => {
          const hour = new Date(r.ratingUpdateTimeSeconds * 1000).getHours();
          const cur = timeOfDayMap.get(hour) || { deltaSum: 0, count: 0 };
          timeOfDayMap.set(hour, { deltaSum: cur.deltaSum + (r.newRating - r.oldRating), count: cur.count + 1 });
        });
        const timeOfDayStats = Array.from(timeOfDayMap.entries())
          .map(([hour, stats]) => ({ hour, ratingDelta: Math.round(stats.deltaSum / stats.count), contestCount: stats.count }))
          .sort((a, b) => a.hour - b.hour);

        // 6. Division Breakdown
        const divMap = new Map<string, { contests: number; deltaSum: number; wins: number }>();
        sortedRatings.forEach((r: any) => {
          let div = "Other";
          if (r.contestName.includes("Div. 1")) div = "Div. 1";
          else if (r.contestName.includes("Div. 2")) div = "Div. 2";
          else if (r.contestName.includes("Div. 3")) div = "Div. 3";
          else if (r.contestName.includes("Div. 4")) div = "Div. 4";
          else if (r.contestName.includes("Educational")) div = "Educational";
          else if (r.contestName.includes("Global")) div = "Global";

          const cur = divMap.get(div) || { contests: 0, deltaSum: 0, wins: 0 };
          divMap.set(div, {
            contests: cur.contests + 1,
            deltaSum: cur.deltaSum + (r.newRating - r.oldRating),
            wins: cur.wins + (r.newRating > r.oldRating ? 1 : 0)
          });
        });
        const divisionStats = Array.from(divMap.entries())
          .map(([div, stats]) => ({
            div,
            contests: stats.contests,
            avgDelta: Math.round(stats.deltaSum / stats.contests),
            winRate: Math.round((stats.wins / stats.contests) * 100)
          }))
          .sort((a, b) => b.contests - a.contests);

        // 7. Problem Difficulty Ceiling
        const ceilingMap = new Map<string, number>();
        acSubs.forEach((s: any) => {
          const rating = s.problem.rating;
          if (rating) {
            s.problem.tags?.forEach((tag: string) => {
              ceilingMap.set(tag, Math.max(ceilingMap.get(tag) || 0, rating));
            });
          }
        });
        const difficultyCeiling = Array.from(ceilingMap.entries())
          .map(([tag, maxRating]) => ({ tag, maxRating }))
          .sort((a, b) => b.maxRating - a.maxRating)
          .slice(0, 10);

        // 8. Virtual Contests
        const virtualSubs = submissions.filter((s: any) => s.author.participantType === "VIRTUAL");
        const virtualMap = new Map<number, { solved: Set<string>; penalty: number }>();
        virtualSubs.forEach((s: any) => {
          if (!virtualMap.has(s.contestId)) virtualMap.set(s.contestId, { solved: new Set(), penalty: 0 });
          const v = virtualMap.get(s.contestId)!;
          if (s.verdict === "OK") {
            v.solved.add(s.problem.index);
            v.penalty += Math.floor(s.relativeTimeSeconds / 60);
          }
        });
        const virtualContests = Array.from(virtualMap.entries())
          .map(([id, stats]) => ({ id, name: `Contest ${id}`, solved: stats.solved.size, penalty: stats.penalty }))
          .filter(v => v.solved > 0)
          .sort((a, b) => b.id - a.id)
          .slice(0, 5);

        // 9. Solve Time Distribution (In-contest only)
        const solveTimeCounts = { "0-10m": 0, "10-30m": 0, "30-60m": 0, "60-120m": 0, "120m+": 0 };
        submissions.filter((s: any) => s.author.participantType === "CONTESTANT" && s.verdict === "OK").forEach((s: any) => {
          const mins = Math.floor(s.relativeTimeSeconds / 60);
          if (mins <= 10) solveTimeCounts["0-10m"]++;
          else if (mins <= 30) solveTimeCounts["10-30m"]++;
          else if (mins <= 60) solveTimeCounts["30-60m"]++;
          else if (mins <= 120) solveTimeCounts["60-120m"]++;
          else solveTimeCounts["120m+"]++;
        });
        const solveTimeDist = Object.entries(solveTimeCounts).map(([label, count]) => ({ label, count }));

        // 10. Weakness Heatmap
        const tagRatingsMap = new Map<string, Map<number, { total: number; ac: number }>>();
        submissions.forEach((s: any) => {
          const pr = s.problem.rating;
          if (pr && pr >= 800 && pr <= 3500) {
            const roundedRating = Math.floor(pr / 200) * 200; // Bucket by 200
            s.problem.tags?.forEach((tag: string) => {
              if (!tagRatingsMap.has(tag)) tagRatingsMap.set(tag, new Map());
              const rMap = tagRatingsMap.get(tag)!;
              if (!rMap.has(roundedRating)) rMap.set(roundedRating, { total: 0, ac: 0 });
              const cur = rMap.get(roundedRating)!;
              cur.total++;
              if (s.verdict === "OK") cur.ac++;
            });
          }
        });

        const topTags = Array.from(tagRatingsMap.keys())
          .map(tag => {
            let t = 0;
            tagRatingsMap.get(tag)!.forEach(v => t += v.total);
            return { tag, total: t };
          })
          .sort((a, b) => b.total - a.total)
          .slice(0, 8)
          .map(t => t.tag);

        const weaknessHeatmap = topTags.map(tag => {
          const rMap = tagRatingsMap.get(tag)!;
          const ratings: Record<number, { total: number; ac: number; rate: number }> = {};
          rMap.forEach((stats, rating) => {
            ratings[rating] = { ...stats, rate: Math.round((stats.ac / stats.total) * 100) };
          });
          return { tag, ratings };
        });

        setData({
          ratingHistory: history,
          trendLine: trend,
          consistencyScore,
          longestGreenStreak: maxStreak,
          currentGreenStreak: currentStreak,
          activityCalendar: activityCal,
          languageStats,
          timeOfDayStats,
          divisionStats,
          difficultyCeiling,
          virtualContests,
          solveTimeDist,
          weaknessHeatmap
        });

      } catch (err: any) {
        setError(err.message || "Failed to load extended analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [handle, refreshKey]);

  return { ...data, loading, error };
}
