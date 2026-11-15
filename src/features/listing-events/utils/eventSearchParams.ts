import { weekendRange } from './weekendRange';

/** The optional open house / auction filters as they appear in Filters. */
export interface EventFilterValues {
  hasOpenHouse?: boolean | null;
  openHouseWeekend?: boolean | null;
  hasAuction?: boolean | null;
  auctionWithinDays?: number | null;
}

/**
 * Filters → search query pairs. "This weekend" is worked out here, in the
 * visitor's time zone, and sent as a window; the server checks it again.
 */
export function eventSearchParams(f: EventFilterValues, now: Date): [string, string][] {
  const out: [string, string][] = [];
  if (f.openHouseWeekend === true) {
    const { from, to } = weekendRange(now);
    out.push(['openHouseFrom', from.toISOString()], ['openHouseTo', to.toISOString()]);
  } else if (f.hasOpenHouse === true) {
    out.push(['hasOpenHouse', 'true']);
  }
  if (f.auctionWithinDays != null && Number.isInteger(f.auctionWithinDays) && f.auctionWithinDays > 0) {
    out.push(['auctionWithinDays', String(f.auctionWithinDays)]);
  } else if (f.hasAuction === true) {
    out.push(['hasAuction', 'true']);
  }
  return out;
}
