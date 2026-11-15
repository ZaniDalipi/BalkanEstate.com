/**
 * Search query → the optional open house / auction conditions. Pure: bad or
 * missing values are simply ignored, so a hand-edited URL never errors.
 */

const MAX_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface EventSearch {
  /** Plain conditions to AND into the property filter. */
  conditions: Record<string, unknown>[];
  /** Open house window that needs a lookup in the OpenHouse collection. */
  openHouseWindow?: { from: Date; to: Date };
  /** Sort by the soonest open house or auction. */
  soonestFirst: boolean;
}

const asDate = (raw: unknown): Date | null => {
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function parseEventSearch(query: Record<string, unknown>, now: Date): EventSearch {
  const conditions: Record<string, unknown>[] = [];
  let openHouseWindow: EventSearch['openHouseWindow'];

  const from = asDate(query.openHouseFrom);
  const to = asDate(query.openHouseTo);
  if (from && to && to > from && to.getTime() - from.getTime() <= MAX_WINDOW_MS && to > now) {
    openHouseWindow = { from: from < now ? now : from, to };
  } else if (query.hasOpenHouse === 'true') {
    // Still running counts too: its start may be a little in the past.
    conditions.push({ nextOpenHouseAt: { $exists: true } });
  }

  if (query.hasAuction === 'true' || query.auctionWithinDays != null) {
    const days = Number(query.auctionWithinDays);
    const within = Number.isInteger(days) && days >= 1 && days <= 90 ? days : null;
    conditions.push({
      'auction.startsAt': within
        ? { $gt: new Date(now.getTime() - DAY_MS), $lte: new Date(now.getTime() + within * DAY_MS) }
        : { $gt: new Date(now.getTime() - DAY_MS) },
    });
  }

  const soonestFirst = query.sortBy === 'events-soonest';
  if (soonestFirst) conditions.push({ nextEventAt: { $exists: true } });

  return { conditions, openHouseWindow, soonestFirst };
}
