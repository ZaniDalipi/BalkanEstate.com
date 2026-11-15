import type { EventSource } from '../types';
import { thisWeekRange } from './thisWeekRange';

/**
 * Keep only homes whose next open house falls in this week (from now to the
 * end of Sunday), soonest first. The server already filters; this keeps the
 * row right even if a page stays open past Sunday midnight.
 */
export function openHousesThisWeek<T extends EventSource>(homes: T[], now: Date): T[] {
  const { from, to } = thisWeekRange(now);
  const start = (h: T) => Date.parse(h.nextOpenHouse?.startsAt ?? '');
  return homes
    .filter((h) => {
      const o = h.nextOpenHouse;
      return !!o && Date.parse(o.startsAt) < to.getTime() && Date.parse(o.endsAt) > from.getTime();
    })
    .sort((a, b) => start(a) - start(b));
}
