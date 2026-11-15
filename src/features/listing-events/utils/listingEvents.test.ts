import { describe, expect, it } from 'vitest';
import { weekendRange } from './weekendRange';
import { thisWeekRange } from './thisWeekRange';
import { openHousesThisWeek } from './weekOpenHouses';
import type { EventSource } from '../types';
import { eventSearchParams } from './eventSearchParams';
import { listingEvents, matchesEventFilters, nextEventTime, nextListingEvent, auctionIsLive } from './listingEvents';
import { countdownParts, directionsUrl, safeHttpUrl } from './eventFormat';
import { markerEventTag } from '@/src/features/map/utils/markerEventTag';
import { draftAuction, auctionToForm, EMPTY_AUCTION_FORM } from '@/src/features/auctions/utils/auctionDraft';

// Wednesday 18 Nov 2026, 10:00 local
const wed = new Date(2026, 10, 18, 10, 0);
const iso = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();
const labels = { openHouse: 'Open', auction: 'Auction', today: 'today' };

describe('weekendRange', () => {
  it('is the coming Saturday 00:00 to Monday 00:00', () => {
    expect(weekendRange(wed)).toEqual({ from: new Date(2026, 10, 21), to: new Date(2026, 10, 23) });
  });
  it('is the current weekend on Saturday and Sunday', () => {
    expect(weekendRange(new Date(2026, 10, 21, 15)).from).toEqual(new Date(2026, 10, 21));
    expect(weekendRange(new Date(2026, 10, 22, 15)).from).toEqual(new Date(2026, 10, 21));
  });
});

describe('thisWeekRange', () => {
  it('runs from now to the end of Sunday', () => {
    expect(thisWeekRange(wed)).toEqual({ from: wed, to: new Date(2026, 10, 23) });
    const sunday = new Date(2026, 10, 22, 15);
    expect(thisWeekRange(sunday).to).toEqual(new Date(2026, 10, 23));
    const monday = new Date(2026, 10, 23, 9);
    expect(thisWeekRange(monday).to).toEqual(new Date(2026, 10, 30));
  });

  it("keeps only this week's open houses, soonest first", () => {
    const oh = (d: number, h: number) => ({ nextOpenHouse: { startsAt: iso(d, h), endsAt: iso(d, h + 2) } });
    const homes: Array<{ id: string } & EventSource> = [{ id: 'sat', ...oh(21, 11) }, { id: 'next', ...oh(24, 11) }, { id: 'thu', ...oh(19, 17) }, { id: 'none' }];
    expect(openHousesThisWeek(homes, wed).map((h) => h.id)).toEqual(['thu', 'sat']);
  });
});

describe('eventSearchParams', () => {
  it('sends nothing by default', () => expect(eventSearchParams({}, wed)).toEqual([]));
  it('turns "this weekend" into a window and "this week" into days', () => {
    expect(eventSearchParams({ openHouseWeekend: true, hasOpenHouse: true, auctionWithinDays: 7 }, wed)).toEqual([
      ['openHouseFrom', new Date(2026, 10, 21).toISOString()],
      ['openHouseTo', new Date(2026, 10, 23).toISOString()],
      ['auctionWithinDays', '7'],
    ]);
    expect(eventSearchParams({ hasOpenHouse: true, hasAuction: true }, wed)).toEqual([['hasOpenHouse', 'true'], ['hasAuction', 'true']]);
    expect(eventSearchParams({ openHouseThisWeek: true }, wed)).toEqual([
      ['openHouseFrom', wed.toISOString()],
      ['openHouseTo', new Date(2026, 10, 23).toISOString()],
    ]);
  });
});

describe('listing events', () => {
  const oh = { startsAt: iso(21, 11), endsAt: iso(21, 13) };
  const auction = { startsAt: iso(20, 18), mode: 'online' as const, startingPrice: 80000 };

  it('lists open house and auction soonest first, and picks the next one', () => {
    expect(listingEvents({ nextOpenHouse: oh, auction }, wed).map((e) => e.kind)).toEqual(['auction', 'openHouse']);
    expect(nextListingEvent({ nextOpenHouse: oh }, wed)?.kind).toBe('openHouse');
    expect(nextListingEvent({}, wed)).toBeNull();
  });

  it('drops finished events', () => {
    expect(listingEvents({ nextOpenHouse: { startsAt: iso(18, 7), endsAt: iso(18, 9) } }, wed)).toEqual([]);
    expect(auctionIsLive({ startsAt: iso(17, 11), mode: 'online' }, wed)).toBe(true); // within a day of its start
    expect(auctionIsLive({ startsAt: iso(16, 9), mode: 'online' }, wed)).toBe(false);
  });

  it('matches the optional filters', () => {
    const p = { nextOpenHouse: oh, auction };
    expect(matchesEventFilters({}, {}, wed)).toBe(true);
    expect(matchesEventFilters(p, { openHouseWeekend: true }, wed)).toBe(true);
    expect(matchesEventFilters({ nextOpenHouse: { startsAt: iso(19, 11), endsAt: iso(19, 13) } }, { openHouseWeekend: true }, wed)).toBe(false);
    expect(matchesEventFilters({}, { hasOpenHouse: true }, wed)).toBe(false);
    expect(matchesEventFilters({ nextOpenHouse: { startsAt: iso(19, 11), endsAt: iso(19, 13) } }, { openHouseThisWeek: true }, wed)).toBe(true);
    expect(matchesEventFilters({ nextOpenHouse: { startsAt: iso(24, 11), endsAt: iso(24, 13) } }, { openHouseThisWeek: true }, wed)).toBe(false);
    expect(matchesEventFilters(p, { auctionWithinDays: 7 }, wed)).toBe(true);
    expect(matchesEventFilters({ auction: { ...auction, startsAt: iso(30, 18) } }, { auctionWithinDays: 7 }, wed)).toBe(false);
    expect(matchesEventFilters({ nextOpenHouse: oh }, { hasAuction: true }, wed)).toBe(false);
  });

  it('sorts homes without an event last', () => {
    expect(nextEventTime({ auction }, wed)).toBe(Date.parse(auction.startsAt));
    expect(nextEventTime({}, wed)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('eventFormat', () => {
  it('splits a countdown and stops at zero', () => {
    const now = new Date('2026-11-18T10:00:00Z');
    expect(countdownParts('2026-11-20T12:30:15Z', now)).toEqual({ days: 2, hours: 2, minutes: 30, seconds: 15, done: false });
    expect(countdownParts('2026-11-18T09:00:00Z', now).done).toBe(true);
  });
  it('only lets http(s) links through', () => {
    expect(safeHttpUrl('https://bank.example/a')).toBe('https://bank.example/a');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('not a url')).toBeNull();
  });
  it('builds a directions link', () => {
    expect(directionsUrl(42.28, 18.84)).toBe('https://www.google.com/maps/dir/?api=1&destination=42.28%2C18.84');
  });
});

describe('markerEventTag', () => {
  it('tags a pin with the kind and day, or "today"', () => {
    const tag = markerEventTag({ nextOpenHouse: { startsAt: iso(21, 11), endsAt: iso(21, 13) } }, wed, 'en', labels);
    expect(tag?.kind).toBe('openHouse');
    expect(tag?.text).toBe('Open Sat');
    expect(markerEventTag({ auction: { startsAt: iso(18, 18), mode: 'online' } }, wed, 'en', labels)?.text).toBe('Auction today');
    expect(markerEventTag({}, wed, 'en', labels)).toBeNull();
  });
});

describe('draftAuction', () => {
  const form = { ...EMPTY_AUCTION_FORM, date: '2026-11-25', time: '18:00', location: 'Notary, Budva' };
  it('makes an in-person auction', () => {
    const r = draftAuction({ ...form, startingPrice: '80.000' }, wed);
    expect(r).toEqual({ ok: true, value: { startsAt: new Date(2026, 10, 25, 18).toISOString(), mode: 'in_person', location: 'Notary, Budva', startingPrice: 80000 } });
  });
  it.each([
    [{ date: '' }, 'date'],
    [{ date: '2026-11-17' }, 'date'],
    [{ location: '' }, 'location'],
    [{ mode: 'online' as const, url: '' }, 'url'],
    [{ url: 'ftp://x' }, 'url'],
    [{ startingPrice: 'abc' }, 'startingPrice'],
  ])('points %j at %s', (over, field) => {
    const r = draftAuction({ ...form, ...over }, wed);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error.field).toBe(field);
  });
  it('keeps a saved auction that has begun, and round-trips the form', () => {
    const started = new Date(2026, 10, 17, 18).toISOString();
    expect(draftAuction({ ...form, date: '2026-11-17' }, wed, started).ok).toBe(true);
    expect(auctionToForm({ startsAt: started, mode: 'online', url: 'https://x.test' })).toMatchObject({ date: '2026-11-17', time: '18:00', mode: 'online', url: 'https://x.test' });
    expect(auctionToForm(null)).toBeNull();
  });
});
