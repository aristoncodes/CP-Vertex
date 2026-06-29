/**
 * Canonical Codeforces rating-tier colors — the single source of truth.
 *
 * Replaces the 4+ divergent `ratingColor()` implementations that previously
 * lived in friends/train/upsolve/gym-finder/RatingChart (some with simply
 * wrong hex). Prefer `getRatingColor()` (returns a `var(--rating-*)` token)
 * so colors stay theme-aware in both inline styles and SVG/Recharts. Use
 * `getRatingColorHex()` only when a literal hex is unavoidable.
 *
 * Light-mode hex values are the OFFICIAL Codeforces tier colors. Dark-mode
 * hex values are brightened for readability. Both are mirrored as CSS
 * variables in globals.css (`--rating-*`).
 */

export interface CfTier {
  /** Codeforces rank name */
  name: string;
  /** Lower bound (inclusive). Tiers are checked high → low. */
  min: number;
  /** CSS custom property name, e.g. "--rating-expert" */
  cssVar: string;
  /** Official Codeforces light-mode hex */
  lightHex: string;
  /** Brightened dark-mode hex */
  darkHex: string;
}

/** Sorted high → low so the first match wins. */
export const CF_TIERS: CfTier[] = [
  { name: "Legendary Grandmaster",     min: 3000, cssVar: "--rating-lgm",        lightHex: "#ff0000", darkHex: "#ff1a1a" },
  { name: "International Grandmaster",  min: 2600, cssVar: "--rating-igm",        lightHex: "#ff0000", darkHex: "#ff3333" },
  { name: "Grandmaster",               min: 2400, cssVar: "--rating-gm",         lightHex: "#ff0000", darkHex: "#ff4d4d" },
  { name: "International Master",       min: 2300, cssVar: "--rating-im",         lightHex: "#ff8c00", darkHex: "#ffb84d" },
  { name: "Master",                    min: 2100, cssVar: "--rating-master",     lightHex: "#ff8c00", darkHex: "#ffa733" },
  { name: "Candidate Master",          min: 1900, cssVar: "--rating-cm",         lightHex: "#aa00aa", darkHex: "#d24dd2" },
  { name: "Expert",                    min: 1600, cssVar: "--rating-expert",     lightHex: "#0000ff", darkHex: "#4d8eff" },
  { name: "Specialist",                min: 1400, cssVar: "--rating-specialist", lightHex: "#03a89e", darkHex: "#2bd4c4" },
  { name: "Pupil",                     min: 1200, cssVar: "--rating-pupil",      lightHex: "#008000", darkHex: "#3ecf5a" },
  { name: "Newbie",                    min: 0,    cssVar: "--rating-newbie",     lightHex: "#808080", darkHex: "#9aa0a6" },
];

const NEWBIE = CF_TIERS[CF_TIERS.length - 1];

/** Resolve a rating to its Codeforces tier. Unrated (0/undefined) → Newbie. */
export function getRatingTier(rating: number | null | undefined): CfTier {
  const r = rating ?? 0;
  return CF_TIERS.find((t) => r >= t.min) ?? NEWBIE;
}

/**
 * Theme-aware color for a rating, as a CSS `var(--rating-*)` reference.
 * Works in inline `style` and in Recharts `fill`/`stroke` (SVG resolves vars).
 * This is the preferred API — it adapts to light/dark automatically.
 */
export function getRatingColor(rating: number | null | undefined): string {
  return `var(${getRatingTier(rating).cssVar})`;
}

/**
 * Literal hex for a rating. Use only where a CSS var can't resolve
 * (e.g. canvas/WebGL). Defaults to light-mode hex.
 */
export function getRatingColorHex(
  rating: number | null | undefined,
  theme: "light" | "dark" = "light"
): string {
  const tier = getRatingTier(rating);
  return theme === "dark" ? tier.darkHex : tier.lightHex;
}

/** Codeforces rank name for a rating (e.g. "Expert"). */
export function getRatingTierName(rating: number | null | undefined): string {
  return getRatingTier(rating).name;
}
