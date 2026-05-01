import { createClient, SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_KEY
    if (!url || !key) {
      console.warn("Supabase credentials not set — realtime events will be skipped")
      // Return a no-op client
      return {
        channel: () => ({
          send: async () => "ok" as const,
        }),
      } as unknown as SupabaseClient
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

/**
 * Emit a level-up event to the user's realtime channel.
 * Frontend triggers GSAP level-up animation sequence.
 */
export async function emitLevelUp(
  userId: string,
  newLevel: number
): Promise<void> {
  try {
    await getSupabase().channel(`user:${userId}`).send({
      type: "broadcast",
      event: "level_up",
      payload: { newLevel },
    })
  } catch (err) {
    console.error("Failed to emit level_up event:", err)
  }
}

/**
 * Emit an XP gain event to the user's realtime channel.
 * Frontend triggers Anime.js particle burst.
 */
export async function emitXPGain(
  userId: string,
  xp: number,
  source: string
): Promise<void> {
  try {
    await getSupabase().channel(`user:${userId}`).send({
      type: "broadcast",
      event: "xp_gain",
      payload: { xp, source },
    })
  } catch (err) {
    console.error("Failed to emit xp_gain event:", err)
  }
}

/**
 * Emit an upsolve complete event — triggers toast on frontend.
 */
export async function emitUpsolveComplete(
  userId: string,
  problemTitle: string,
  bonusXP: number
): Promise<void> {
  try {
    await getSupabase().channel(`user:${userId}`).send({
      type: "broadcast",
      event: "upsolve_complete",
      payload: { problemTitle, bonusXP },
    })
  } catch (err) {
    console.error("Failed to emit upsolve_complete event:", err)
  }
}

