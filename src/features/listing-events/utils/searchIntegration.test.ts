import { describe, expect, it } from 'vitest';
import { initialFilters, type Filters, type Property } from '@/types';
import { filterAndSortProperties } from '@/utils/propertyUtils';

const at = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const home = (id: string, extra: Partial<Property> = {}): Property => ({
  id, sellerId: 's', status: 'active', price: 100000, address: 'a', city: 'Budva', country: 'Montenegro',
  beds: 2, baths: 1, livingRooms: 1, sqft: 70, yearBuilt: 2018, parking: 0, description: '', specialFeatures: [], materials: [],
  imageUrl: '', images: [], lat: 42.28, lng: 18.84, propertyType: 'apartment', createdAt: Date.now(), ...extra,
} as Property);

const homes = [
  home('plain'),
  home('oh-later', { nextOpenHouse: { startsAt: at(200), endsAt: at(202) } }),
  home('auction', { auction: { startsAt: at(48), mode: 'online' } }),
  home('oh-soon', { nextOpenHouse: { startsAt: at(5), endsAt: at(7) } }),
];
const run = (f: Partial<Filters>) => filterAndSortProperties(homes, { ...initialFilters, ...f }).map((p) => p.id);

describe('search page: open house & auction filters and sort (client side)', () => {
  it('changes nothing until asked', () => {
    expect(run({}).sort()).toEqual(['auction', 'oh-later', 'oh-soon', 'plain']);
  });
  it('filters and sorts soonest first, homes without an event last', () => {
    expect(run({ hasOpenHouse: true }).sort()).toEqual(['oh-later', 'oh-soon']);
    expect(run({ hasAuction: true })).toEqual(['auction']);
    expect(run({ sortBy: 'events_soonest' })).toEqual(['oh-soon', 'auction', 'oh-later', 'plain']);
  });
});
