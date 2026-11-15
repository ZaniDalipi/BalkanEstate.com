import type { EventSource, ListingEvent } from '../types';
import { openHouseWindow, type EventFilterValues } from './eventSearchParams';

const DAY_MS = 24 * 60 * 60 * 1000;
const time = (iso: string | undefined): number => (iso ? Date.parse(iso) : NaN);

/** An auction stays "on" until it ends, or for a day after its start without an end. */
export function auctionIsLive(a: EventSource['auction'], now: Date): boolean {
  if (!a) return false;
  const end = Number.isFinite(time(a.endsAt)) ? time(a.endsAt) : time(a.startsAt) + DAY_MS;
  return Number.isFinite(end) && end > now.getTime();
}

const openHouseIsLive = (o: EventSource['nextOpenHouse'], now: Date): boolean =>
  !!o && time(o.endsAt) > now.getTime();

/** Every current event of a listing, soonest first. */
export function listingEvents(p: EventSource, now: Date): ListingEvent[] {
  const out: ListingEvent[] = [];
  if (p.nextOpenHouse && openHouseIsLive(p.nextOpenHouse, now)) {
    out.push({ kind: 'openHouse', startsAt: p.nextOpenHouse.startsAt, endsAt: p.nextOpenHouse.endsAt });
  }
  if (p.auction && auctionIsLive(p.auction, now)) out.push({ kind: 'auction', ...p.auction });
  return out.sort((a, b) => time(a.startsAt) - time(b.startsAt));
}

/** The one to show on a card or pin: the soonest. */
export function nextListingEvent(p: EventSource, now: Date): ListingEvent | null {
  return listingEvents(p, now)[0] ?? null;
}

/** Client-side check of the optional event filters (search runs in the browser). */
export function matchesEventFilters(p: EventSource, f: EventFilterValues, now: Date): boolean {
  const window = openHouseWindow(f, now);
  if (window) {
    const o = p.nextOpenHouse;
    if (!o || !openHouseIsLive(o, now)) return false;
    if (!(time(o.startsAt) < window.to.getTime() && time(o.endsAt) > window.from.getTime())) return false;
  } else if (f.hasOpenHouse === true && !openHouseIsLive(p.nextOpenHouse, now)) {
    return false;
  }
  if (f.auctionWithinDays != null && f.auctionWithinDays > 0) {
    if (!auctionIsLive(p.auction, now)) return false;
    if (time(p.auction?.startsAt) > now.getTime() + f.auctionWithinDays * DAY_MS) return false;
  } else if (f.hasAuction === true && !auctionIsLive(p.auction, now)) {
    return false;
  }
  return true;
}

/** Sort key for "soonest open house / auction": listings without one go last. */
export function nextEventTime(p: EventSource, now: Date): number {
  const e = nextListingEvent(p, now);
  return e ? time(e.startsAt) : Number.POSITIVE_INFINITY;
}
