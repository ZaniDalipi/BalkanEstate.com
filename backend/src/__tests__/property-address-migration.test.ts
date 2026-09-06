process.env.SKIP_TEST_DB = 'true';

import path from 'path';
import { createAddressFormatter, foldPlaceName, loadCitySpellings } from '../services/placeAddress';

/**
 * The migration rewrites addresses that are already in the database, so the
 * thing worth testing is not that it runs — it is that it produces exactly
 * the shape the app shows, keeps the spellings the app uses, and can be run
 * twice without doing damage the second time.
 */

const SPELLINGS = path.resolve(__dirname, '../../../src/shared/geo/placeSpellings.json');

describe('the shared spelling table', () => {
  it('is the app\'s own file, not a copy', () => {
    const spellings = loadCitySpellings(SPELLINGS);
    expect(spellings.Vlore).toBe('Vlorë');
    expect(spellings.Niksic).toBe('Nikšić');
    expect(Object.keys(spellings).length).toBeGreaterThan(50);
  });

  it('only ever adds marks to a name, never changes its letters', () => {
    // The same guarantee the frontend suite asserts: fold a canonical
    // spelling back and it must be the stored name again. A table that broke
    // this would rename cities rather than spell them.
    for (const [stored, local] of Object.entries(loadCitySpellings(SPELLINGS))) {
      expect(foldPlaceName(local)).toBe(foldPlaceName(stored));
    }
  });

  it('refuses to run rather than silently spelling everything in ASCII', () => {
    expect(() => loadCitySpellings('/nowhere/placeSpellings.json')).toThrow(/not found/i);
  });
});

describe('rewriting a stored address', () => {
  const format = createAddressFormatter(loadCitySpellings(SPELLINGS)).format;

  it('puts a bare street line into the three-part shape', () => {
    expect(format({ address: 'Knez Mihailova 42', city: 'Belgrade', country: 'Serbia' }))
      .toBe('Knez Mihailova 42, Belgrade, Serbia');
  });

  it('spells the city the way the app does', () => {
    expect(format({ address: 'Rruga e Kavajes 45', city: 'Vlore', country: 'Albania' }))
      .toBe('Rruga e Kavajes 45, Vlorë, Albania');
  });

  it('strips a whole geocoder string back down to the place', () => {
    expect(format({
      address: 'Himarë, Bashkia Himarë, Vlorë County, 9425, Albania',
      city: 'Vlore',
      country: 'Albania',
    })).toBe('Himarë, Vlorë, Albania');
  });

  it('drops a postcode, a county and a repeated city', () => {
    expect(format({
      address: 'Jadranski Put 12, Opština Budva, Budva, 85310, Montenegro',
      city: 'Budva',
      country: 'Montenegro',
    })).toBe('Jadranski Put 12, Budva, Montenegro');
  });

  it('writes a listing whose address said nothing but its city as the city', () => {
    expect(format({ address: 'Budva', city: 'Budva', country: 'Montenegro' }))
      .toBe('Budva, Montenegro');
    expect(format({ address: '', city: 'Resen', country: 'North Macedonia' }))
      .toBe('Resen, North Macedonia');
  });

  it('keeps a house number, which is not a postcode', () => {
    expect(format({ address: 'Ilica 123', city: 'Zagreb', country: 'Croatia' }))
      .toBe('Ilica 123, Zagreb, Croatia');
    expect(format({ address: 'Stari Grad bb', city: 'Kotor', country: 'Montenegro' }))
      .toBe('Stari Grad bb, Kotor, Montenegro');
  });

  it('is idempotent — a migrated address rewrites to itself', () => {
    const once = format({ address: 'Knez Mihailova 42', city: 'Belgrade', country: 'Serbia' });
    const twice = format({ address: once, city: 'Belgrade', country: 'Serbia' });
    expect(twice).toBe(once);

    const albanian = format({
      address: 'Himarë, Bashkia Himarë, Vlorë County, 9425, Albania',
      city: 'Vlore',
      country: 'Albania',
    });
    expect(format({ address: albanian, city: 'Vlore', country: 'Albania' })).toBe(albanian);
  });

  it('matches the spelling on a listing already filed with diacritics', () => {
    // "Vlore" and "Vlorë" are one city, so neither is repeated in the output.
    expect(format({ address: 'Rruga X, Vlorë', city: 'Vlore', country: 'Albania' }))
      .toBe('Rruga X, Vlorë, Albania');
  });
});
