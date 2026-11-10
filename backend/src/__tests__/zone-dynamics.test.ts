/**
 * Zone dynamics — months of supply decides buyer's / balanced / seller's market.
 */
process.env.SKIP_TEST_DB = 'true';

import type { Neighbour } from '../services/areaPricesService';
import { buildZoneDynamics, scoreFor, verdictFor } from '../services/zoneDynamicsService';

const NOW = new Date('2026-11-10T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

let n = 0;
const neighbour = (extra: Partial<Neighbour> = {}): Neighbour => ({
  id: String(++n),
  price: 100_000,
  pricePerSqm: 1000,
  value: 1000,
  propertyType: 'apartment',
  status: 'active',
  lat: 0,
  lng: 0,
  distanceM: 100,
  ...extra,
});
const active = (count: number) => Array.from({ length: count }, () => neighbour());
const sold = (count: number, closedDaysAgo = 30, listedDaysAgo = 90) =>
  Array.from({ length: count }, () =>
    neighbour({ status: 'sold', closedAt: daysAgo(closedDaysAgo), listedAt: daysAgo(listedDaysAgo) }));

describe('verdictFor / scoreFor', () => {
  it('splits the market at 4 and 7 months of supply', () => {
    expect(verdictFor(2)).toBe('seller');
    expect(verdictFor(4)).toBe('balanced');
    expect(verdictFor(7)).toBe('balanced');
    expect(verdictFor(7.1)).toBe('buyer');
  });

  it('puts the balanced midpoint at 50 and favours sellers as supply shrinks', () => {
    expect(scoreFor(Math.sqrt(28))).toBe(50);
    expect(scoreFor(1)).toBeGreaterThan(scoreFor(3));
    expect(scoreFor(3)).toBeGreaterThan(50);
    expect(scoreFor(12)).toBeLessThan(50);
    expect(scoreFor(0)).toBe(100);
    expect(scoreFor(10_000)).toBe(0);
  });
});

describe('buildZoneDynamics', () => {
  it('calls a seller\'s market when stock is low against sales', () => {
    // 2 on the market, 12 sold in the year → 1 per month → 2 months of supply
    const result = buildZoneDynamics([...active(2), ...sold(12)], NOW);
    expect(result).toMatchObject({ status: 'ok', verdict: 'seller', monthsOfSupply: 2, activeCount: 2, closedLastYear: 12 });
  });

  it('calls a buyer\'s market when stock piles up', () => {
    // 20 on the market, 12 sold → 20 months of supply
    const result = buildZoneDynamics([...active(20), ...sold(12)], NOW);
    expect(result).toMatchObject({ status: 'ok', verdict: 'buyer', monthsOfSupply: 20 });
  });

  it('gives the median days from listing to sale', () => {
    const result = buildZoneDynamics([...active(3), ...sold(4, 10, 70)], NOW);
    expect(result.status === 'ok' && result.medianDaysOnMarket).toBe(60);
  });

  it('ignores sales older than a year and gives no verdict on too few', () => {
    const result = buildZoneDynamics([...active(5), ...sold(2), ...sold(10, 400, 500)], NOW);
    expect(result).toEqual({ status: 'insufficient', activeCount: 5, closedLastYear: 2 });
  });

  it('skips malformed dates instead of throwing', () => {
    const broken = neighbour({ status: 'sold', closedAt: 'not a date' });
    const result = buildZoneDynamics([...active(2), ...sold(3), broken], NOW);
    expect(result).toMatchObject({ status: 'ok', closedLastYear: 3 });
  });
});
