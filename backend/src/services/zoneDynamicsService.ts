/**
 * Zone dynamics — is the area around a listing a buyer's or a seller's market?
 *
 * Measured the way agents measure it: months of supply. Homes on the market
 * now, divided by how many sold (or were let) per month over the last year.
 *   - under 4 months: a seller's market — little stock, homes go quickly
 *   - 4 to 7 months:  balanced
 *   - over 7 months:  a buyer's market — plenty of choice, room to negotiate
 *
 * Pure: takes the neighbours `areaPricesService` already built, so it is
 * testable without a database.
 */

import type { Neighbour } from './areaPricesService';
import { median, toDate } from './areaPricesService';

/** Closings counted from this far back. */
export const DYNAMICS_WINDOW_DAYS = 365;

/** Fewer closings than this in the window and no verdict is given. */
export const MIN_CLOSINGS = 3;

/** Below this many months of supply it is a seller's market. */
export const SELLER_MARKET_MONTHS = 4;

/** Above this many months of supply it is a buyer's market. */
export const BUYER_MARKET_MONTHS = 7;

/** Midpoint of the balanced band, on a log scale; scores 50. */
const BALANCED_MONTHS = Math.sqrt(SELLER_MARKET_MONTHS * BUYER_MARKET_MONTHS);

const DAY_MS = 24 * 60 * 60 * 1000;

export type MarketVerdict = 'seller' | 'balanced' | 'buyer';

export type ZoneDynamics =
  | {
      status: 'ok';
      verdict: MarketVerdict;
      /** 0 = strongly favours buyers, 100 = strongly favours sellers. */
      score: number;
      monthsOfSupply: number;
      activeCount: number;
      closedLastYear: number;
      /** Median days from listing to sale, for homes that closed in the window. */
      medianDaysOnMarket: number | null;
    }
  | {
      status: 'insufficient';
      activeCount: number;
      closedLastYear: number;
    };

export const verdictFor = (monthsOfSupply: number): MarketVerdict => {
  if (monthsOfSupply < SELLER_MARKET_MONTHS) return 'seller';
  if (monthsOfSupply > BUYER_MARKET_MONTHS) return 'buyer';
  return 'balanced';
};

/**
 * Where the marker sits on the buyer → seller bar. Log scale, so halving the
 * supply moves it as far as doubling it does; each halving is 25 points.
 */
export const scoreFor = (monthsOfSupply: number): number => {
  if (monthsOfSupply <= 0) return 100;
  const raw = 50 - 25 * Math.log2(monthsOfSupply / BALANCED_MONTHS);
  return Math.round(Math.min(100, Math.max(0, raw)));
};

export const buildZoneDynamics = (neighbours: Neighbour[], now: Date = new Date()): ZoneDynamics => {
  const since = now.getTime() - DYNAMICS_WINDOW_DAYS * DAY_MS;
  const activeCount = neighbours.filter((n) => n.status === 'active').length;

  const recent = neighbours
    .map((n) => ({ closedAt: toDate(n.closedAt), listedAt: toDate(n.listedAt) }))
    .filter((c): c is { closedAt: Date; listedAt: Date | null } =>
      c.closedAt !== null && c.closedAt.getTime() >= since && c.closedAt.getTime() <= now.getTime());

  const closedLastYear = recent.length;
  if (closedLastYear < MIN_CLOSINGS) {
    return { status: 'insufficient', activeCount, closedLastYear };
  }

  const perMonth = closedLastYear / 12;
  const monthsOfSupply = Math.round((activeCount / perMonth) * 10) / 10;

  // A home re-listed after its closing would give a negative span; skip it.
  const daysOnMarket = recent
    .filter((c) => c.listedAt !== null && c.listedAt <= c.closedAt)
    .map((c) => (c.closedAt.getTime() - (c.listedAt as Date).getTime()) / DAY_MS);
  const dom = median(daysOnMarket);

  return {
    status: 'ok',
    verdict: verdictFor(monthsOfSupply),
    score: scoreFor(monthsOfSupply),
    monthsOfSupply,
    activeCount,
    closedLastYear,
    medianDaysOnMarket: dom === null ? null : Math.round(dom),
  };
};
