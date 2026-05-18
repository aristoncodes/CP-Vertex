/**
 * Codeforces API cache utilities with sessionStorage + 5-minute TTL
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function getCached<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`cf:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > TTL_MS) {
      sessionStorage.removeItem(`cf:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    sessionStorage.setItem(`cf:${key}`, JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable, ignore
  }
}

/** Clear all CF API cache entries — used for manual refresh */
export function clearCFCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("cf:")) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Get the timestamp of the most recent cache entry for a handle */
export function getLastFetchTime(handle: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const key = `cf:user.info?handles=${handle}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return entry.timestamp;
  } catch {
    return null;
  }
}

export async function cfApiFetch<T>(method: string, params: Record<string, string> = {}): Promise<T> {
  const queryStr = new URLSearchParams(params).toString();
  const cacheKey = `${method}?${queryStr}`;

  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const url = `https://codeforces.com/api/${method}?${queryStr}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CF API error: ${res.status}`);
  const json = await res.json();
  if (json.status !== "OK") throw new Error(json.comment || "CF API error");

  setCache(cacheKey, json.result);
  return json.result as T;
}
