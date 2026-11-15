import { weekendRange } from './weekendRange';
import { thisWeekRange } from './thisWeekRange';

/** The open house window the filters ask for, if any ("this weekend" wins over "this week"). */
export function openHouseWindow(f: EventFilterValues, now: Date): { from: Date; to: Date } | null {
  if (f.openHouseWeekend === true) return weekendRange(now);
  if (f.openHouseThisWeek === true) return thisWeekRange(now);
  return null;
}

/** The optional open house / auction filters as they appear in Filters. */
export interface EventFilterValues {
  hasOpenHouse?: boolean | null;
  openHouseWeekend?: boolean | null;
  openHouseThisWeek?: boolean | null;
  hasAuction?: boolean | null;
  auctionWithinDays?: number | null;
}

/**
 * Filters → search query pairs. "This weekend" is worked out here, in the
 * visitor's time zone, and sent as a window; the server checks it again.
 */
export function eventSearchParams(f: EventFilterValues, now: Date): [string, string][] {
  const out: [string, string][] = [];
  const window = openHouseWindow(f, now);
  if (window) {
    out.push(['openHouseFrom', window.from.toISOString()], ['openHouseTo', window.to.toISOString()]);
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
