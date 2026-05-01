"use client";

import { useEffect, useRef } from "react";

/**
 * Auto-sync Codeforces submissions in the background.
 * 
 * Runs a sync every `intervalMs` (default: 10 minutes) while the user
 * is actively using the app. Uses document visibility to pause when
 * the tab is hidden, and debounces via a "last sync" timestamp stored
 * in sessionStorage to avoid duplicate syncs across page navigations.
 */
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_KEY = "cp-vertex:lastAutoSync";

export function useAutoSync(onSyncSuccess?: (imported: number) => void) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const doSync = async () => {
      // Check if we synced recently (within this session)
      const lastSync = sessionStorage.getItem(SESSION_KEY);
      if (lastSync) {
        const elapsed = Date.now() - parseInt(lastSync, 10);
        if (elapsed < SYNC_INTERVAL_MS) return;
      }

      try {
        const res = await fetch("/api/user/cf-handle/sync", { method: "POST" });
        if (res.ok) {
          sessionStorage.setItem(SESSION_KEY, String(Date.now()));
          const data = await res.json();
          if (onSyncSuccess) onSyncSuccess(data.imported || 0);
        } else if (res.status === 429) {
          // 429 means rate-limited (synced recently), still counts as "done"
          sessionStorage.setItem(SESSION_KEY, String(Date.now()));
        }
      } catch {
        // Network error — skip silently, will retry next interval
      }
    };

    // Run once on mount (respects the debounce)
    doSync();

    // Set up periodic sync
    timerRef.current = setInterval(doSync, SYNC_INTERVAL_MS);

    // Pause/resume on tab visibility
    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        // Tab became visible — sync now and restart timer
        doSync();
        timerRef.current = setInterval(doSync, SYNC_INTERVAL_MS);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [onSyncSuccess]);
}
