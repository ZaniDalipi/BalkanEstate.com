/**
 * The maths behind the "Neighbourhood prices" section of a property page.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  basisFor,
  boundingBox,
  buildStats,
  buildTrend,
  closedEvents,
  distanceMeters,
  fallbackTypesFor,
  lastQuarters,
  median,
  normalizePrice,
  pricePerSqm,
  quarterOf,
  roundMoney,
  toNeighbour,
  valueOf,
  TREND_QUARTERS,
  type AreaListing,
} from '../services/areaPricesService';

const SALE = basisFor('sale');
const MONTHLY = basisFor('rent', 'monthly');
const NIGHTLY = basisFor('rent', 'daily');

const listing = (overrides: Partial<AreaListing>): AreaListing => ({
  _id: 'x',
  price: 100_000,
  sqft: 100,
  propertyType: 'apartment',
  status: 'active',
  lat: 42.66,
  lng: 21.16,
  ...overrides,
});

describe('distanceMeters', () => {
  it('is zero for the same point and ~111 km per degree of latitude', () => {
    expect(distanceMeters(42, 21, 42, 21)).toBe(0);
    expect(distanceMeters(42, 21, 43, 21)).toBeCloseTo(111_195, -2);
  });
});

describe('boundingBox', () => {
  it('contains every point within the radius', () => {
    const box = boundingBox(42.66, 21.16, 2);
    expect(21.16 + 2 / (111.32 * Math.cos((42.66 * Math.PI) / 180))).toBeLessThanOrEqual(box.maxLng + 1e-9);
    expect(42.66 + 2 / 111.32).toBeLessThanOrEqual(box.maxLat + 1e-9);
  });
});

describe('median', () => {
  it('handles empty, odd and even lists', () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('pricePerSqm', () => {
  it('is null without an area, and keeps a decimal on small figures like rents', () => {
    expect(pricePerSqm(100_000, 0)).toBeNull();
    expect(pricePerSqm(100_000, undefined)).toBeNull();
    expect(pricePerSqm(100_000, 80)).toBe(1250);
    expect(pricePerSqm(550, 65)).toBe(8.5);
    expect(roundMoney(1234.56)).toBe(1235);
  });
});

describe('basis', () => {
  it('compares sales and long lets per m², short stays on the nightly price', () => {
    expect(SALE).toEqual({ listingType: 'sale', metric: 'perSqm' });
    expect(basisFor('rent')).toEqual({ listingType: 'rent', rentUnit: 'month', metric: 'perSqm' });
    expect(basisFor('rent', 'weekly')).toEqual(MONTHLY);
    expect(NIGHTLY).toEqual({ listingType: 'rent', rentUnit: 'night', metric: 'price' });
  });

  it('turns a weekly rent into a monthly one and leaves the rest alone', () => {
    expect(normalizePrice(100, 'weekly', MONTHLY)).toBe(433);
    expect(normalizePrice(500, 'monthly', MONTHLY)).toBe(500);
    expect(normalizePrice(60, 'daily', NIGHTLY)).toBe(60);
    expect(normalizePrice(100_000, undefined, SALE)).toBe(100_000);
  });

  it('values a nightly let on its price, not its size', () => {
    expect(valueOf(80, 200, NIGHTLY)).toBe(80);
    expect(valueOf(800, 100, MONTHLY)).toBe(8);
  });

  it('widens luxury villas only to villas', () => {
    expect(fallbackTypesFor('luxury-villa')).toEqual(['luxury-villa', 'villa']);
    expect(fallbackTypesFor('apartment')).toBeNull();
  });
});

describe('quarters', () => {
  it('names the quarter of a date', () => {
    expect(quarterOf(new Date('2026-01-15T00:00:00Z'))).toBe('2026-Q1');
    expect(quarterOf(new Date('2026-12-31T00:00:00Z'))).toBe('2026-Q4');
  });

  it('lists the last quarters oldest first, crossing years', () => {
    expect(lastQuarters(3, new Date('2026-04-01T00:00:00Z'))).toEqual(['2025-Q4', '2026-Q1', '2026-Q2']);
  });
});

describe('closedEvents', () => {
  it('is the sale for a sold home', () => {
    const soldAt = new Date('2026-05-01T00:00:00Z');
    expect(closedEvents(listing({ status: 'sold', soldAt }), SALE)).toEqual([{ at: soldAt, price: 100_000 }]);
    expect(closedEvents(listing({}), SALE)).toEqual([]);
  });

  it('is every past let plus the current one for a rental', () => {
    const events = closedEvents(
      listing({
        price: 150,
        rentPeriod: 'weekly',
        status: 'rented',
        rentedAt: new Date('2026-06-01T00:00:00Z'),
        rentalHistory: [
          { startDate: new Date('2025-01-01T00:00:00Z'), monthlyRent: 600 },
          { startDate: new Date('2025-07-01T00:00:00Z'), monthlyRent: 0 }, // no rent recorded: skipped
        ],
      }),
      MONTHLY
    );
    expect(events.map((e) => e.price)).toEqual([600, 650]);
  });

  it('brings nightly history back to a nightly rent', () => {
    const events = closedEvents(
      listing({ price: 70, rentPeriod: 'daily', rentalHistory: [{ startDate: new Date('2026-02-01T00:00:00Z'), monthlyRent: 2_100 }] }),
      NIGHTLY
    );
    expect(events).toEqual([{ at: new Date('2026-02-01T00:00:00Z'), price: 70 }]);
  });
});

describe('toNeighbour', () => {
  it('measures distance from the centre and reports the sale', () => {
    const soldAt = new Date('2026-05-01T00:00:00Z');
    const n = toNeighbour(listing({ status: 'sold', soldAt, lat: 42.67 }), 42.66, 21.16, SALE);
    expect(n.status).toBe('sold');
    expect(n.closedAt).toBe(soldAt.toISOString());
    expect(n.closedPrice).toBe(100_000);
    expect(n.distanceM).toBeGreaterThan(1000);
    expect(n.distanceM).toBeLessThan(1200);
    expect(n.value).toBe(1000);
  });

  it('shows a rental back on the market with its last let, and never its tenant', () => {
    const n = toNeighbour(
      listing({
        price: 900,
        rentalHistory: [
          { startDate: new Date('2024-01-01T00:00:00Z'), monthlyRent: 700 },
          { startDate: new Date('2025-03-01T00:00:00Z'), monthlyRent: 800, tenantName: 'Private Person' } as never,
        ],
      }),
      42.66,
      21.16,
      MONTHLY
    );
    expect(n.status).toBe('active');
    expect(n.value).toBe(9);
    expect(n.closedPrice).toBe(800);
    expect(n.closedValue).toBe(8);
    expect(JSON.stringify(n)).not.toContain('Private Person');
  });
});

describe('buildTrend', () => {
  const now = new Date('2026-09-15T00:00:00Z');

  it('keeps every quarter, with nulls where nothing happened', () => {
    const trend = buildTrend([], SALE, now);
    expect(trend).toHaveLength(TREND_QUARTERS);
    expect(trend[trend.length - 1].period).toBe('2026-Q3');
    expect(trend.every((t) => t.askingValue === null && t.closedValue === null)).toBe(true);
  });

  it('puts asking prices in the listing quarter and sold prices in the sale quarter', () => {
    const trend = buildTrend(
      [
        listing({ price: 100_000, createdAt: new Date('2026-02-01T00:00:00Z') }),
        listing({ price: 120_000, createdAt: new Date('2026-03-01T00:00:00Z') }),
        listing({
          price: 150_000,
          status: 'sold',
          createdAt: new Date('2026-01-10T00:00:00Z'),
          soldAt: new Date('2026-08-01T00:00:00Z'),
        }),
        // No area — cannot have a €/m², left out
        listing({ sqft: 0, createdAt: new Date('2026-02-01T00:00:00Z') }),
      ],
      SALE,
      now
    );
    const q1 = trend.find((t) => t.period === '2026-Q1')!;
    const q3 = trend.find((t) => t.period === '2026-Q3')!;
    expect(q1.askingCount).toBe(3);
    expect(q1.askingValue).toBe(1200);
    expect(q3.closedCount).toBe(1);
    expect(q3.closedValue).toBe(1500);
  });

  it('charts every past let of a rental in the quarter it started', () => {
    const trend = buildTrend(
      [listing({ price: 900, rentalHistory: [
        { startDate: new Date('2025-02-01T00:00:00Z'), monthlyRent: 700 },
        { startDate: new Date('2026-02-01T00:00:00Z'), monthlyRent: 800 },
      ] })],
      MONTHLY,
      now
    );
    expect(trend.find((t) => t.period === '2025-Q1')!.closedValue).toBe(7);
    expect(trend.find((t) => t.period === '2026-Q1')!.closedValue).toBe(8);
  });
});

describe('buildStats', () => {
  it('summarises asking and sold prices and compares the subject', () => {
    const neighbours = [
      toNeighbour(listing({ price: 100_000 }), 42.66, 21.16, SALE),
      toNeighbour(listing({ price: 120_000 }), 42.66, 21.16, SALE),
      toNeighbour(listing({ price: 140_000, status: 'sold', soldAt: new Date() }), 42.66, 21.16, SALE),
    ];
    const stats = buildStats(neighbours, 1320);
    expect(stats.activeCount).toBe(2);
    expect(stats.closedCount).toBe(1);
    expect(stats.medianAskingValue).toBe(1100);
    expect(stats.medianClosedValue).toBe(1400);
    expect(stats.medianAskingPrice).toBe(110_000);
    // Median of all three is 1200; 1320 is 10% above it
    expect(stats.medianValue).toBe(1200);
    expect(stats.subjectVsMedianPct).toBe(10);
  });

  it('counts a rental let before as rented, even when it is back on the market', () => {
    const relisted = toNeighbour(
      listing({ price: 900, rentalHistory: [{ startDate: new Date('2025-01-01T00:00:00Z'), monthlyRent: 800 }] }),
      42.66,
      21.16,
      MONTHLY
    );
    const stats = buildStats([relisted], 10);
    expect(stats.activeCount).toBe(1);
    expect(stats.closedCount).toBe(1);
    expect(stats.medianClosedValue).toBe(8);
  });

  it('has no comparison when the subject has no value', () => {
    expect(buildStats([], null).subjectVsMedianPct).toBeNull();
  });
});
