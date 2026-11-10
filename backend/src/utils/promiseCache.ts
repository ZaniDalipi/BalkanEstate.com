/**
 * A small in-memory cache of promises: entries expire after `ttlMs`,
 * concurrent callers for the same key share one in-flight call, a rejected
 * call is dropped so the next caller tries again, and the oldest entry is
 * evicted past `maxEntries`.
 */
export interface PromiseCache<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
  clear(): void;
}

export function createPromiseCache<T>(ttlMs: number, maxEntries: number): PromiseCache<T> {
  const entries = new Map<string, { expires: number; value: Promise<T> }>();

  return {
    get(key, load) {
      const hit = entries.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;

      const value = load();
      entries.delete(key); // re-insert so Map order stays oldest-first
      entries.set(key, { expires: Date.now() + ttlMs, value });
      value.catch(() => {
        if (entries.get(key)?.value === value) entries.delete(key);
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
