/**
 * How many listings one sync or preview of a user's feed may fetch.
 *
 * A feed is fetched whole by default (every page of the site), up to a safety
 * cap; a caller can still ask for fewer with `?limit=N`.
 */
export const FEED_SYNC_MAX = 5000;
export const FEED_PREVIEW_MAX = 2000;

export type LimitResult = { ok: true; value: number } | { ok: false; error: string };

export const parseListingLimit = (raw: unknown, max: number): LimitResult => {
  if (raw === undefined || raw === '') return { ok: true, value: max };
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n < 1) {
    return { ok: false, error: `limit must be a positive integer between 1 and ${max}` };
  }
  return { ok: true, value: Math.min(max, Math.floor(n)) };
};
