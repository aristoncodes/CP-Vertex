"use client";

import { useUserStats } from "@/hooks/useUserStats";
import { getRatingColor, getRatingTierName } from "@/lib/colors";

/**
 * Side-by-side comparison of two Codeforces handles. Pure CF-API data
 * (via useUserStats), so it works with no login — built to be shareable
 * ("I beat my rival on DP").
 */
export function HandleCompare({ a, b }: { a: string; b: string }) {
  const sa = useUserStats(a);
  const sb = useUserStats(b);
  const loading = sa.loading || sb.loading;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em", marginBottom: 16 }}>
        Head-to-head
      </h1>

      {/* Handle headers */}
      <div className="grid-2-collapse" style={{ marginBottom: 16 }}>
        <HandleHead handle={a} rating={sa.rating} />
        <HandleHead handle={b} rating={sb.rating} />
      </div>

      {/* Metric comparison */}
      <div className="n-card" style={{ padding: "8px 0" }}>
        <CompareRow label="Rating"        a={sa.rating}        b={sb.rating}        higherWins loading={loading} />
        <CompareRow label="Solve rate"    a={sa.solveRate}     b={sb.solveRate}     suffix="%" higherWins loading={loading} />
        <CompareRow label="Avg penalty"   a={sa.avgPenalty}    b={sb.avgPenalty}    suffix="m" higherWins={false} loading={loading} />
        <CompareRow label="Upsolve backlog" a={sa.upsolveBacklog} b={sb.upsolveBacklog} higherWins={false} loading={loading} />
      </div>

      {/* Per-tag success comparison (shared tags) */}
      <TagCompare aHandle={a} bHandle={b} aTags={sa.tagStats} bTags={sb.tagStats} loading={loading} />
    </div>
  );
}

function HandleHead({ handle, rating }: { handle: string; rating: number }) {
  const color = getRatingColor(rating);
  return (
    <div className="n-card" style={{ padding: "16px 20px", textAlign: "center" }}>
      <a
        href={`/u/${encodeURIComponent(handle)}`}
        style={{ fontSize: 18, fontWeight: 700, color, textDecoration: "none" }}
      >
        {handle}
      </a>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
        {rating > 0 ? `${rating} · ${getRatingTierName(rating)}` : "Unrated"}
      </div>
    </div>
  );
}

function CompareRow({
  label, a, b, suffix = "", higherWins, loading,
}: { label: string; a: number; b: number; suffix?: string; higherWins: boolean; loading: boolean }) {
  const aWins = loading ? false : higherWins ? a > b : a < b;
  const bWins = loading ? false : higherWins ? b > a : b < a;
  const cell = (val: number, win: boolean) => (
    <div style={{
      flex: 1, textAlign: "center", fontSize: 15,
      fontWeight: win ? 700 : 500,
      color: win ? "var(--success)" : "var(--text-primary)",
    }}>
      {loading ? "—" : `${val.toLocaleString()}${suffix}`}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: "0.5px solid var(--border)" }}>
      {cell(a, aWins)}
      <div style={{ width: 140, textAlign: "center", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      {cell(b, bWins)}
    </div>
  );
}

interface TagStat { tag: string; successRate: number }

function TagCompare({
  aHandle, bHandle, aTags, bTags, loading,
}: { aHandle: string; bHandle: string; aTags: TagStat[]; bTags: TagStat[]; loading: boolean }) {
  if (loading) return null;
  const bMap = new Map(bTags.map((t) => [t.tag, t.successRate]));
  const shared = aTags
    .filter((t) => bMap.has(t.tag))
    .map((t) => ({ tag: t.tag, a: t.successRate, b: bMap.get(t.tag)! }))
    .slice(0, 10);

  if (shared.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Topic success rate — {aHandle} vs {bHandle}
      </div>
      <div className="n-card" style={{ padding: "8px 0" }}>
        {shared.map((t) => (
          <CompareRow key={t.tag} label={t.tag} a={t.a} b={t.b} suffix="%" higherWins loading={false} />
        ))}
      </div>
    </div>
  );
}
