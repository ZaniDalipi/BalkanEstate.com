/**
 * The maths behind the "Neighbourhood prices" section of a property page.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  boundingBox,
  buildStats,
  buildTrend,
  distanceMeters,
  lastQuarters,
  median,
  pricePerSqm,
  quarterOf,
  toNeighbour,
  TREND_QUARTERS,
  type AreaListing,
} from '../services/areaPricesService';

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
    // 2 km due east and due north are inside the box
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
  it('is null without an area', () => {
    expect(pricePerSqm(100_000, 0)).toBeNull();
    expect(pricePerSqm(100_000, undefined)).toBeNull();
    expect(pricePerSqm(100_000, 80)).toBe(1250);
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

describe('toNeighbour', () => {
  it('measures distance from the centre and reports the sale date', () => {
    const soldAt = new Date('2026-05-01T00:00:00Z');
    const n = toNeighbour(listing({ status: 'sold', soldAt, lat: 42.67 }), 42.66, 21.16);
    expect(n.status).toBe('sold');
    expect(n.closedAt).toBe(soldAt.toISOString());
    expect(n.distanceM).toBeGreaterThan(1000);
    expect(n.distanceM).toBeLessThan(1200);
    expect(n.pricePerSqm).toBe(1000);
  });
});

describe('buildTrend', () => {
  const now = new Date('2026-09-15T00:00:00Z');

  it('keeps every quarter, with nulls where nothing happened', () => {
    const trend = buildTrend([], now);
    expect(trend).toHaveLength(TREND_QUARTERS);
    expect(trend[trend.length - 1].period).toBe('2026-Q3');
    expect(trend.every((t) => t.askingPricePerSqm === null && t.closedPricePerSqm === null)).toBe(true);
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
      now
    );
    const q1 = trend.find((t) => t.period === '2026-Q1')!;
    const q3 = trend.find((t) => t.period === '2026-Q3')!;
    expect(q1.askingCount).toBe(3);
    expect(q1.askingPricePerSqm).toBe(1200);
    expect(q3.closedCount).toBe(1);
    expect(q3.closedPricePerSqm).toBe(1500);
  });
});

describe('buildStats', () => {
  it('summarises asking and sold prices and compares the subject', () => {
    const neighbours = [
      toNeighbour(listing({ price: 100_000 }), 42.66, 21.16),
      toNeighbour(listing({ price: 120_000 }), 42.66, 21.16),
      toNeighbour(listing({ price: 140_000, status: 'sold', soldAt: new Date() }), 42.66, 21.16),
    ];
    const stats = buildStats(neighbours, 1320);
    expect(stats.activeCount).toBe(2);
    expect(stats.closedCount).toBe(1);
    expect(stats.medianAskingPricePerSqm).toBe(1100);
    expect(stats.medianClosedPricePerSqm).toBe(1400);
    expect(stats.medianAskingPrice).toBe(110_000);
    // Median of all three is 1200; 1320 is 10% above it
    expect(stats.medianPricePerSqm).toBe(1200);
    expect(stats.subjectVsMedianPct).toBe(10);
  });

  it('has no comparison when the subject has no area', () => {
    expect(buildStats([], null).subjectVsMedianPct).toBeNull();
  });
});
