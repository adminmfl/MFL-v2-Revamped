// Simple in-memory client-side cache for SPA-style navigation.
// Lives per browser tab (module-level Map) and is cleared on reload.

type CacheValue<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheValue<unknown>>();

const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function getClientCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setClientCache<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  const expiresAt = Date.now() + Math.max(0, ttlMs);
  cache.set(key, { value, expiresAt });
}

export function invalidateClientCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
