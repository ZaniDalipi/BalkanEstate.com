/**
 * Feed imports file listings under the cities of the app's catalogue, read
 * from a copy the backend keeps (backend/src/data/placeCatalog.json). If this
 * fails, the frontend lists changed: run `npm run sync:places`.
 */
import { describe, it, expect } from 'vitest';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { BALKAN_LOCALITIES } from '@/src/shared/geo/localities';
import catalogue from '../../backend/src/data/placeCatalog.json';

describe("the backend's copy of the place catalogue", () => {
  it('matches the cities the listing form offers', () => {
    expect(catalogue.countries).toEqual(JSON.parse(JSON.stringify(BALKAN_LOCATIONS)));
  });

  it('matches the villages and resorts of each city', () => {
    expect(catalogue.localities).toEqual(JSON.parse(JSON.stringify(BALKAN_LOCALITIES)));
  });
});
