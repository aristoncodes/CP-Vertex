export type DifficultyTier = "Newbie" | "Pupil" | "Specialist" | "Expert" | "Master" | "Grandmaster";

export interface DifficultyInfo {
  tier: DifficultyTier;
  color: string;
  cssClass: string;
  range: string;
}

const tiers: { max: number; info: DifficultyInfo }[] = [
  { max: 1000, info: { tier: "Newbie",       color: "#9e9e9e", cssClass: "diff-newbie",  range: "800–1000" } },
  { max: 1400, info: { tier: "Pupil",        color: "#00e676", cssClass: "diff-pupil",   range: "1100–1400" } },
  { max: 1800, info: { tier: "Specialist",   color: "#00e5ff", cssClass: "diff-spec",    range: "1500–1800" } },
  { max: 2200, info: { tier: "Expert",       color: "#448aff", cssClass: "diff-expert",  range: "1900–2200" } },
  { max: 2600, info: { tier: "Master",       color: "#ff8c00", cssClass: "diff-master",  range: "2300–2600" } },
  { max: 9999, info: { tier: "Grandmaster",  color: "#ff2d55", cssClass: "diff-gm",      range: "2700+" } },
];

export function getDifficulty(rating: number): DifficultyInfo {
  for (const t of tiers) {
    if (rating <= t.max) return t.info;
  }
  return tiers[tiers.length - 1].info;
}

/** XP earned per problem based on difficulty rating */
export function calcXP(rating: number): number {
  if (rating <= 1000) return 20;
  if (rating <= 1400) return 40;
  if (rating <= 1800) return 80;
  if (rating <= 2200) return 150;
  if (rating <= 2600) return 300;
  return 500;
}

/** XP required to reach a given level */
export function xpForLevel(level: number): number {
  return Math.floor(1000 * Math.pow(1.15, level - 1));
}

/** Format large numbers */
export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}
