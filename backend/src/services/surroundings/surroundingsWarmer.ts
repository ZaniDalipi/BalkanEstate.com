/**
 * Works out a home's noise and traffic ahead of its first visitor, when the
 * listing is created or its pin moves, so the page shows them at once.
 *
 * Polite to the public Overpass servers, whose guideline for regular
 * automated use is about 100 queries a day: one lookup at a time, spaced,
 * and capped per day. With your own server (OVERPASS_URL) the cap is higher.
 *   SURROUNDINGS_WARM_DAILY_CAP    lookups per UTC day (default 100, or 5000 with OVERPASS_URL)
 *   SURROUNDINGS_WARM_INTERVAL_MS  gap between lookups (default 30 s)
 * Homes left over when the cap is reached are looked up when first visited.
 */

import { apiLogger } from '../../utils/logger';
import { hasUsableLocation } from '../../utils/coordinates';
import { getSurroundings, hasStoredSurroundings, surroundingsKey } from './surroundingsService';

const MAX_QUEUE = 2000;

export const warmDailyCap = (): number => {
  const configured = Number.parseInt(process.env.SURROUNDINGS_WARM_DAILY_CAP ?? '', 10);
  if (Number.isFinite(configured) && configured >= 0) return configured;
  return process.env.OVERPASS_URL?.trim() ? 5000 : 100;
};

const warmIntervalMs = (): number => {
  const configured = Number.parseInt(process.env.SURROUNDINGS_WARM_INTERVAL_MS ?? '', 10);
  return Number.isFinite(configured) && configured >= 0 ? configured : 30_000;
};

const queue = new Map<string, { lat: number; lng: number }>();
let running = false;
let day = '';
let usedToday = 0;

const today = () => new Date().toISOString().slice(0, 10);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });

/** Take one network lookup from today's allowance; false once it is spent. */
const takeAllowance = (): boolean => {
  if (day !== today()) {
    day = today();
    usedToday = 0;
  }
  if (usedToday >= warmDailyCap()) return false;
  usedToday += 1;
  return true;
};

const drain = async (): Promise<void> => {
  if (running) return;
  running = true;
  try {
    while (queue.size > 0) {
      const [key, spot] = queue.entries().next().value as [string, { lat: number; lng: number }];
      queue.delete(key);
      if (await hasStoredSurroundings(spot.lat, spot.lng)) continue;
      if (!takeAllowance()) {
        apiLogger.info(`Surroundings warm-up: daily cap reached, ${queue.size + 1} left for first visits`);
        queue.clear();
        break;
      }
      try {
        await getSurroundings(spot.lat, spot.lng);
      } catch {
        // Logged by the Overpass client; the first visitor will try again.
      }
      await sleep(warmIntervalMs());
    }
  } finally {
    running = false;
  }
};

/** Queue a home for a lookup in the background. Never throws, never waits. */
export const warmSurroundings = (lat: unknown, lng: unknown): void => {
  if (process.env.NODE_ENV === 'test' || !hasUsableLocation(lat, lng)) return;
  const spot = { lat: lat as number, lng: lng as number };
  const key = surroundingsKey(spot.lat, spot.lng);
  if (queue.has(key) || queue.size >= MAX_QUEUE) return;
  queue.set(key, spot);
  void drain();
};

/** For tests. */
export const warmQueueSize = (): number => queue.size;
export const resetWarmer = (): void => {
  queue.clear();
  day = '';
  usedToday = 0;
};
