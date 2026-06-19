"use client"

import { useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

interface XPGainPayload {
  xp: number
  source: string
}

interface LevelUpPayload {
  newLevel: number
}

interface UseRealtimeOptions {
  userId: string | undefined
  onXPGain?: (payload: XPGainPayload) => void
  onLevelUp?: (payload: LevelUpPayload) => void
}

/**
 * Hook to listen for realtime XP and level-up events via Supabase Realtime.
 * Triggers animation callbacks when events are received.
 *
 * Usage:
 * ```tsx
 * useRealtime({
 *   userId: session?.user?.id,
 *   onXPGain: ({ xp, source }) => triggerXPParticles(xp),
 *   onLevelUp: ({ newLevel }) => triggerLevelUpAnimation(newLevel),
 * })
 * ```
 */
export function useRealtime({ userId, onXPGain, onLevelUp }: UseRealtimeOptions) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`user:${userId}`)
      .on("broadcast", { event: "xp_gain" }, ({ payload }) => {
        if (onXPGain && payload) {
          onXPGain(payload as XPGainPayload)
        }
      })
      .on("broadcast", { event: "level_up" }, ({ payload }) => {
        if (onLevelUp && payload) {
          onLevelUp(payload as LevelUpPayload)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, onXPGain, onLevelUp])
}
