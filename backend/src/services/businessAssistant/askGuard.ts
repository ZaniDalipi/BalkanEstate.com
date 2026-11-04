/**
 * Spam and cost protection for "ask the business". Layered, cheapest first:
 *
 *   1. Per visitor IP — a burst limit (per minute), an hourly and a daily cap.
 *   2. Answer cache — the same opening question about the same business (a
 *      suggested-question tap, a refresh, a bot) is answered from memory for
 *      a day, and costs nothing. Cleared by editing the profile (updatedAt).
 *   3. Per business — a daily cap on model calls, so many IPs can't drain one.
 *   4. Site-wide — a daily budget of model calls (BUSINESS_ASK_DAILY_LIMIT).
 *
 * In-memory, per server process: enough for one instance; with several, each
 * keeps its own counts (the caps then apply per instance).
 */

export interface AskLimits {
  perMinute: number;
  perHour: number;
  perDayPerIp: number;
  perDayPerListing: number;
  perDayGlobal: number;
}

export const DEFAULT_ASK_LIMITS: AskLimits = {
  perMinute: 4,
  perHour: 20,
  perDayPerIp: 50,
  perDayPerListing: 300,
  perDayGlobal: 2000,
};

export type AskBlock =
  | { blocked: false }
  | { blocked: true; reason: 'burst' | 'hourly' | 'daily' | 'listing' | 'busy'; retryAfterSeconds: number };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_KEYS = 50_000;
const MAX_CACHE = 2_000;

/** Counts per key in fixed windows; old windows are dropped as the map grows. */
class WindowCounter {
  private windows = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly windowMs: number) {}

  /** Seconds until this key may go again, or 0 when under the limit. */
  wait(key: string, limit: number, now: number): number {
    const w = this.windows.get(key);
    if (!w || now >= w.resetAt || w.count < limit) return 0;
    return Math.max(1, Math.ceil((w.resetAt - now) / 1000));
  }

  add(key: string, now: number): void {
    const w = this.windows.get(key);
    if (!w || now >= w.resetAt) {
      if (this.windows.size >= MAX_KEYS) this.sweep(now);
      this.windows.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      w.count += 1;
    }
  }

  private sweep(now: number): void {
    for (const [k, w] of this.windows) if (now >= w.resetAt) this.windows.delete(k);
    // Still full (a flood of new IPs): drop the oldest entries.
    while (this.windows.size >= MAX_KEYS) this.windows.delete(this.windows.keys().next().value as string);
  }
}

/** "  Are you OPEN on Saturday?? " and "are you open on saturday" are the same question. */
export const normalizeQuestion = (q: string): string =>
  q.toLowerCase().normalize('NFKC').replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();

export class AskGuard {
  private minute = new WindowCounter(MINUTE);
  private hour = new WindowCounter(HOUR);
  private dayIp = new WindowCounter(DAY);
  private dayListing = new WindowCounter(DAY);
  private dayGlobal = new WindowCounter(DAY);
  private cache = new Map<string, { at: number; value: unknown }>();

  constructor(private readonly limits: AskLimits = DEFAULT_ASK_LIMITS, private readonly clock: () => number = Date.now) {}

  /** Before anything else: is this visitor asking too often? Counts the attempt when allowed. */
  admitVisitor(ip: string): AskBlock {
    const now = this.clock();
    const checks: Array<[WindowCounter, number, 'burst' | 'hourly' | 'daily']> = [
      [this.minute, this.limits.perMinute, 'burst'],
      [this.hour, this.limits.perHour, 'hourly'],
      [this.dayIp, this.limits.perDayPerIp, 'daily'],
    ];
    for (const [counter, limit, reason] of checks) {
      const wait = counter.wait(ip, limit, now);
      if (wait) return { blocked: true, reason, retryAfterSeconds: wait };
    }
    for (const [counter] of checks) counter.add(ip, now);
    return { blocked: false };
  }

  /** Before calling the model: is this business, or the whole site, over today's budget? Counts the call when allowed. */
  admitModelCall(listingId: string): AskBlock {
    const now = this.clock();
    const busy = this.dayGlobal.wait('all', this.limits.perDayGlobal, now);
    if (busy) return { blocked: true, reason: 'busy', retryAfterSeconds: busy };
    const listing = this.dayListing.wait(listingId, this.limits.perDayPerListing, now);
    if (listing) return { blocked: true, reason: 'listing', retryAfterSeconds: listing };
    this.dayGlobal.add('all', now);
    this.dayListing.add(listingId, now);
    return { blocked: false };
  }

  /** Cache key for an opening question (follow-ups depend on the chat, so they aren't cached). */
  static cacheKey(listingId: string, version: string, question: string, historyLength: number): string | null {
    return historyLength === 0 ? `${listingId}:${version}:${normalizeQuestion(question)}` : null;
  }

  cached<T>(key: string | null): T | undefined {
    if (!key) return undefined;
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    if (this.clock() - hit.at >= DAY) {
      this.cache.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  remember(key: string | null, value: unknown): void {
    if (!key) return;
    if (this.cache.size >= MAX_CACHE) this.cache.delete(this.cache.keys().next().value as string);
    this.cache.set(key, { at: this.clock(), value });
  }
}

/** Limits from the environment (the site-wide budget is the one worth tuning). */
export function limitsFromEnv(env: NodeJS.ProcessEnv = process.env): AskLimits {
  const n = (v: string | undefined, d: number) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.floor(x) : d;
  };
  return { ...DEFAULT_ASK_LIMITS, perDayGlobal: n(env.BUSINESS_ASK_DAILY_LIMIT, DEFAULT_ASK_LIMITS.perDayGlobal) };
}

/** The one guard the API uses. */
export const askGuard = new AskGuard(limitsFromEnv());
