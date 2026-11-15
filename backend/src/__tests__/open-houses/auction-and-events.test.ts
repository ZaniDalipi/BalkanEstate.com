process.env.SKIP_TEST_DB = 'true';

import { parseAuction, parseAuctionField } from '../../services/auction/auctionRules';
import { pickNextEvent } from '../../services/listingEvents/pickNextEvent';
import { parseEventSearch } from '../../services/listingEvents/eventSearchFilters';

const now = new Date('2026-11-15T10:00:00Z');
const H = 3_600_000;
const at = (h: number) => new Date(now.getTime() + h * H);

describe('parseAuction', () => {
  const online = { startsAt: at(48).toISOString(), mode: 'online', url: 'https://bank.example/auction/1', startingPrice: '80000' };

  it('accepts an online auction with a starting price', () => {
    const r = parseAuction(online, now);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ mode: 'online', startingPrice: 80000 });
  });

  it.each([
    [{ ...online, startsAt: undefined }, 'date and time'],
    [{ ...online, startsAt: at(-1).toISOString() }, 'in the future'],
    [{ ...online, startsAt: at(24 * 400).toISOString() }, '12 months'],
    [{ ...online, endsAt: at(47).toISOString() }, 'end after it starts'],
    [{ ...online, mode: 'phone' }, 'online or in person'],
    [{ ...online, url: 'javascript:alert(1)' }, 'http'],
    [{ ...online, url: '' }, 'link'],
    [{ ...online, mode: 'in_person', url: undefined }, 'where the auction'],
    [{ ...online, startingPrice: -5 }, 'positive'],
  ])('rejects %j', (input, message) => {
    const r = parseAuction(input, now);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain(message);
  });

  it('lets a listing be saved again with its own auction that has begun', () => {
    const started = { ...online, startsAt: at(-1).toISOString() };
    expect(parseAuction(started, now, at(-1)).ok).toBe(true);
  });

  it('tells "leave it" (undefined) from "remove it" (null)', () => {
    expect(parseAuctionField(undefined, now)).toEqual({ ok: true, value: undefined });
    expect(parseAuctionField(null, now)).toEqual({ ok: true, value: null });
  });
});

describe('pickNextEvent', () => {
  it('takes the sooner of the next open house and the auction', () => {
    const r = pickNextEvent([{ startsAt: at(50), endsAt: at(52) }, { startsAt: at(5), endsAt: at(7) }], { startsAt: at(20) }, now);
    expect(r.nextOpenHouseAt).toEqual(at(5));
    expect(r.nextEventAt).toEqual(at(5));
  });

  it('keeps a running open house and drops a finished one', () => {
    const r = pickNextEvent([{ startsAt: at(-3), endsAt: at(-1) }, { startsAt: at(-1), endsAt: at(1) }], undefined, now);
    expect(r.nextOpenHouseAt).toEqual(at(-1));
  });

  it('forgets an auction a day after it started when no end is given', () => {
    expect(pickNextEvent([], { startsAt: at(-23) }, now).nextEventAt).toEqual(at(-23));
    expect(pickNextEvent([], { startsAt: at(-25) }, now).nextEventAt).toBeUndefined();
  });
});

describe('parseEventSearch', () => {
  it('does nothing by default', () => {
    expect(parseEventSearch({}, now)).toEqual({ conditions: [], openHouseWindow: undefined, soonestFirst: false });
  });

  it('uses the window the visitor sends (their own weekend), within limits', () => {
    const r = parseEventSearch({ openHouseFrom: at(60).toISOString(), openHouseTo: at(108).toISOString() }, now);
    expect(r.openHouseWindow).toEqual({ from: at(60), to: at(108) });
    const tooLong = parseEventSearch({ openHouseFrom: at(1).toISOString(), openHouseTo: at(24 * 30).toISOString(), hasOpenHouse: 'true' }, now);
    expect(tooLong.openHouseWindow).toBeUndefined();
    expect(tooLong.conditions).toEqual([{ nextOpenHouseAt: { $exists: true } }]);
  });

  it('filters auctions, optionally within N days, and sorts soonest first', () => {
    const r = parseEventSearch({ auctionWithinDays: '7', sortBy: 'events-soonest' }, now);
    expect(r.conditions[0]).toEqual({ 'auction.startsAt': { $gt: at(-24), $lte: at(24 * 7) } });
    expect(r.conditions[1]).toEqual({ nextEventAt: { $exists: true } });
    expect(r.soonestFirst).toBe(true);
    // Out-of-range days fall back to "any upcoming auction".
    expect(parseEventSearch({ auctionWithinDays: '9999' }, now).conditions[0]).toEqual({ 'auction.startsAt': { $gt: at(-24) } });
  });
});
