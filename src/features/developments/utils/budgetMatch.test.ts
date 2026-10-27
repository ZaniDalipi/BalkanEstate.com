import { describe, it, expect } from 'vitest';
import { describePick, featuredPick, matchBudget, parseBudget, pickReference, unitPricePerSqm } from './budgetMatch';
import type { PublicUnit } from '../types';

let seq = 0;
const unit = (over: Partial<PublicUnit>): PublicUnit =>
  ({
    id: `u${++seq}`,
    developmentId: 'd',
    buildingId: 'b',
    floorId: 'f',
    unitNumber: `A${seq}`,
    unitType: 'apartment',
    availability: 'available',
    listingIds: [],
    ...over,
  }) as PublicUnit;

describe('parseBudget', () => {
  it.each([
    ['150.000 €', 150_000],
    ['150,000', 150_000],
    ["150'000", 150_000],
    ['150000', 150_000],
    ['€ 150 000', 150_000],
    ['150k', 150_000],
    ['1,2m', 1_200_000],
    ['1.5M', 1_500_000],
    ['150.000,50', 150_000],
    ['150000 EUR', 150_000],
  ])('reads %s', (raw, value) => {
    expect(parseBudget(raw)).toEqual({ ok: true, value });
  });

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['abc', 'invalid'],
    ['-5000', 'invalid'],
    ['1.2.3k', 'invalid'],
    ['15.00.000', 'invalid'],
    ['500', 'tooLow'],
    ['900m', 'tooHigh'],
  ])('rejects %j as %s', (raw, error) => {
    expect(parseBudget(raw)).toEqual({ ok: false, error });
  });
});

describe('unitPricePerSqm', () => {
  it('prefers the published figure, else works it out from the area', () => {
    expect(unitPricePerSqm(unit({ price: 100_000, pricePerSqm: 1_500, totalArea: 50 }))).toBe(1_500);
    expect(unitPricePerSqm(unit({ price: 100_000, totalArea: 50 }))).toBe(2_000);
    expect(unitPricePerSqm(unit({ price: 100_000 }))).toBeNull();
    expect(unitPricePerSqm(unit({ priceOnRequest: true, price: 100_000, totalArea: 50 }))).toBeNull();
  });
});

describe('pickReference', () => {
  const four = [1, 2, 3, 4].map((i) => unit({ price: 100_000 * i, totalArea: 50 * i }));
  it('uses the city average when there is one', () => {
    expect(pickReference(four, { pricePerSqm: 1_800, place: 'Tirana' })).toEqual({ kind: 'location', pricePerSqm: 1_800, place: 'Tirana' });
  });
  it('falls back to the residence average, only with enough priced homes', () => {
    expect(pickReference(four)).toEqual({ kind: 'residence', pricePerSqm: 2_000 });
    expect(pickReference(four.slice(0, 3))).toBeNull();
    expect(pickReference(four, { pricePerSqm: 0 })).toEqual({ kind: 'residence', pricePerSqm: 2_000 });
  });
});

describe('describePick', () => {
  const ref = { kind: 'location' as const, pricePerSqm: 2_000 };
  it('flags homes well below the reference as bargains', () => {
    expect(describePick(unit({ price: 90_000, totalArea: 50 }), ref)).toMatchObject({ belowPct: 10, bargain: true });
    expect(describePick(unit({ price: 97_000, totalArea: 50 }), ref)).toMatchObject({ belowPct: 3, bargain: false });
    expect(describePick(unit({ price: 120_000, totalArea: 50 }), ref)).toMatchObject({ belowPct: -20, bargain: false });
    expect(describePick(unit({ price: 90_000 }), null)).toMatchObject({ belowPct: null, bargain: false });
  });
});

describe('matchBudget', () => {
  const ref = { kind: 'residence' as const, pricePerSqm: 2_000 };
  const cheap = unit({ price: 80_000, totalArea: 40 });
  const bargain = unit({ price: 100_000, totalArea: 60 }); // 1.667/m² → 17% below
  const mid = unit({ price: 140_000, totalArea: 70 });
  const top = unit({ price: 160_000, totalArea: 80 });
  const sold = unit({ price: 90_000, totalArea: 60, availability: 'sold' });
  const hidden = unit({ priceOnRequest: true, totalArea: 60 });
  const all = [cheap, bargain, mid, top, sold, hidden];

  it('offers bargains first, then the most home for the money, only homes on sale', () => {
    const r = matchBudget(all, 150_000, ref);
    expect(r.matches.map((m) => m.unit.id)).toEqual([bargain.id, mid.id, cheap.id]);
    expect(r.stretch).toBeNull();
    expect(r.cheapest).toBeNull();
  });

  it('adds a home just over budget when few fit', () => {
    const r = matchBudget(all, 95_000, ref);
    expect(r.matches.map((m) => m.unit.id)).toEqual([cheap.id]);
    expect(r.stretch?.unit.id).toBe(bargain.id);
    // More than 10% over is not a stretch.
    expect(matchBudget(all, 85_000, ref).stretch).toBeNull();
  });

  it('never dead-ends: points at the most affordable home when nothing fits', () => {
    const r = matchBudget(all, 50_000, ref);
    expect(r.matches).toEqual([]);
    expect(r.stretch).toBeNull();
    expect(r.cheapest?.unit.id).toBe(cheap.id);
  });

  it('returns nothing at all when nothing is on sale with a price', () => {
    expect(matchBudget([sold, hidden], 500_000, ref)).toEqual({ matches: [], stretch: null, cheapest: null });
  });
});

describe('featuredPick', () => {
  it('features the biggest bargain, else the most affordable home', () => {
    const ref = { kind: 'residence' as const, pricePerSqm: 2_000 };
    const a = unit({ price: 90_000, totalArea: 50 });
    const b = unit({ price: 80_000, totalArea: 50 });
    const c = unit({ price: 70_000, totalArea: 30 });
    expect(featuredPick([a, b, c], ref)?.unit.id).toBe(b.id);
    expect(featuredPick([c], ref)?.unit.id).toBe(c.id);
    expect(featuredPick([unit({ availability: 'sold', price: 1 })], ref)).toBeNull();
  });
});
