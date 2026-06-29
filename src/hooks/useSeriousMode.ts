"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";

/**
 * "Serious mode" dials down RPG/gamification framing (confetti, level-up
 * fanfare, "Boss Fight" language) for advanced users who find it childish,
 * without removing the underlying mechanics.
 *
 * Preference (localStorage `cp-vertex:seriousMode`):
 *   - unset / "auto" → auto-on for users rated >= 1600
 *   - "on"           → always serious
 *   - "off"          → always playful
 *
 * The logged-out public analyzer passes `force: true` so it's always serious.
 */
export type SeriousPref = "auto" | "on" | "off";

const KEY = "cp-vertex:seriousMode";
/** CF "Expert" threshold — at/above this, gamification reads as childish. */
export const SERIOUS_AUTO_RATING = 1600;
/** Fired after setSeriousPref so same-tab listeners update immediately. */
const EVENT = "cp-vertex:seriousModeChange";

export function getSeriousPref(): SeriousPref {
  if (typeof window === "undefined") return "auto";
  const v = localStorage.getItem(KEY);
  return v === "on" || v === "off" ? v : "auto";
}

export function setSeriousPref(pref: SeriousPref) {
  if (pref === "auto") localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, pref);
  window.dispatchEvent(new Event(EVENT));
}

function resolve(pref: SeriousPref, rating: number, force: boolean): boolean {
  if (force) return true;
  if (pref === "on") return true;
  if (pref === "off") return false;
  return rating >= SERIOUS_AUTO_RATING;
}

// Subscribe to preference changes (same-tab event + cross-tab storage event).
function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Resolved boolean: should the UI render in serious (toned-down) mode?
 * @param opts.force  Always serious (used by the public analyzer).
 * @param opts.rating Override rating (else taken from the session).
 */
export function useSeriousMode(opts?: { force?: boolean; rating?: number }): boolean {
  const { data: session } = useSession();
  const rating = opts?.rating ?? session?.user?.cfRating ?? 0;
  const force = opts?.force ?? false;

  // Read the preference via an external-store subscription so it stays in sync
  // with the settings toggle (and other tabs) without an effect, and renders
  // "auto" on the server to avoid a hydration mismatch.
  const pref = useSyncExternalStore<SeriousPref>(
    subscribe,
    getSeriousPref,
    () => "auto"
  );

  return resolve(pref, rating, force);
}
