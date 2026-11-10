/**
 * A small in-memory cache of promises: entries expire after `ttlMs`,
 * concurrent callers for the same key share one in-flight call, and the
 * oldest entry is evicted past `maxEntries`.
 *
 * A rejected call is kept for `failureTtlMs` (default 0: dropped at once, so
 * the next caller tries again). A short failure TTL stops a burst of visitors
 * from hammering an outside service while it is down.
 */
export interface PromiseCache<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
}

export function createPromiseCache<T>(ttlMs: number, maxEntries: number, failureTtlMs = 0): PromiseCache<T> {
  const entries = new Map<string, { expires: number; value: Promise<T> }>();

  return {
    get(key, load) {
      const hit = entries.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;

      const value = load();
      entries.delete(key); // re-insert so Map order stays oldest-first
      entries.set(key, { expires: Date.now() + ttlMs, value });
      value.catch(() => {
        const entry = entries.get(key);
        if (entry?.value !== value) return;
        if (failureTtlMs > 0) entry.expires = Date.now() + failureTtlMs;
        else entries.delete(key);
      });

      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      return value;
    },
    clear() {
      entries.clear();
    },
  };
}
