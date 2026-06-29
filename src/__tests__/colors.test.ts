import { expect, test, describe } from "vitest";
import {
  getRatingTier,
  getRatingTierName,
  getRatingColor,
  getRatingColorHex,
} from "@/lib/colors";

describe("colors.ts — Codeforces rating tiers", () => {
  test("maps canonical boundary ratings to the right tier", () => {
    expect(getRatingTierName(0)).toBe("Newbie");
    expect(getRatingTierName(1199)).toBe("Newbie");
    expect(getRatingTierName(1200)).toBe("Pupil");
    expect(getRatingTierName(1400)).toBe("Specialist");
    expect(getRatingTierName(1600)).toBe("Expert");
    expect(getRatingTierName(1900)).toBe("Candidate Master");
    expect(getRatingTierName(2100)).toBe("Master");
    expect(getRatingTierName(2300)).toBe("International Master");
    expect(getRatingTierName(2400)).toBe("Grandmaster");
    expect(getRatingTierName(2600)).toBe("International Grandmaster");
    expect(getRatingTierName(3000)).toBe("Legendary Grandmaster");
    expect(getRatingTierName(4000)).toBe("Legendary Grandmaster");
  });

  test("unrated / null / undefined fall back to Newbie", () => {
    expect(getRatingTierName(null)).toBe("Newbie");
    expect(getRatingTierName(undefined)).toBe("Newbie");
  });

  test("getRatingColor returns a CSS var reference (theme-aware)", () => {
    expect(getRatingColor(1600)).toBe("var(--rating-expert)");
    expect(getRatingColor(2400)).toBe("var(--rating-gm)");
    expect(getRatingColor(0)).toBe("var(--rating-newbie)");
  });

  test("getRatingColorHex returns official CF light hex by default", () => {
    expect(getRatingColorHex(2400)).toBe("#ff0000"); // GM red
    expect(getRatingColorHex(1200)).toBe("#008000"); // Pupil green
    expect(getRatingColorHex(1600, "dark")).toBe("#4d8eff"); // Expert, dark variant
  });

  test("tier lookup just below each threshold", () => {
    expect(getRatingTier(1599).name).toBe("Specialist");
    expect(getRatingTier(2099).name).toBe("Candidate Master");
    expect(getRatingTier(2299).name).toBe("Master");
    expect(getRatingTier(2399).name).toBe("International Master");
  });
});
