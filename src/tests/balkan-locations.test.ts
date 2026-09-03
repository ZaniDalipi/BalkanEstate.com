/**
 * `BALKAN_LOCATIONS` is the one list every location picker in the app is built
 * from — the create-listing form, the search and rental filters, the agency and
 * admin tools. A duplicate or a stray coordinate here shows up as a broken
 * picker or a map that flies to the wrong country, so the shape of the list is
 * pinned down by these tests rather than by review alone.
 */

import { describe, it, expect } from 'vitest';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { normalizePlaceName } from '@/shared/geo';

describe('BALKAN_LOCATIONS', () => {
  it('names every country exactly once, with an ISO code', () => {
    const names = BALKAN_LOCATIONS.map((country) => normalizePlaceName(country.name));
    expect(new Set(names).size).toBe(names.length);

    for (const country of BALKAN_LOCATIONS) {
      expect(country.code, country.name).toMatch(/^[A-Z]{2}$/);
      expect(country.cities.length, country.name).toBeGreaterThan(0);
    }
  });

  it('never offers the same city twice within a country', () => {
    for (const country of BALKAN_LOCATIONS) {
      const names = country.cities.map((city) => normalizePlaceName(city.name));
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      expect(duplicates, `duplicate cities in ${country.name}`).toEqual([]);
    }
  });

  it('places every city inside the Balkan bounding box', () => {
    for (const country of BALKAN_LOCATIONS) {
      for (const city of country.cities) {
        const label = `${city.name} (${country.name})`;
        expect(Number.isFinite(city.lat), label).toBe(true);
        expect(Number.isFinite(city.lng), label).toBe(true);
        expect(city.lat, label).toBeGreaterThan(34);
        expect(city.lat, label).toBeLessThan(49);
        expect(city.lng, label).toBeGreaterThan(12);
        expect(city.lng, label).toBeLessThan(30);
      }
    }
  });

  it('offers the Albanian riviera towns sellers actually list in', () => {
    const albania = BALKAN_LOCATIONS.find((country) => country.name === 'Albania');
    const names = albania?.cities.map((city) => city.name) ?? [];

    expect(names).toEqual(
      expect.arrayContaining(['Himare', 'Dhermi', 'Ksamil', 'Borsh', 'Qeparo', 'Palase', 'Orikum'])
    );
  });

  it('offers resort towns beyond Albania too', () => {
    const cityNamesOf = (countryName: string) =>
      BALKAN_LOCATIONS.find((country) => country.name === countryName)?.cities.map((city) => city.name) ?? [];

    expect(cityNamesOf('Montenegro')).toEqual(expect.arrayContaining(['Sveti Stefan', 'Petrovac', 'Perast']));
    expect(cityNamesOf('Bulgaria')).toEqual(expect.arrayContaining(['Sozopol', 'Nesebar', 'Bansko']));
    expect(cityNamesOf('Croatia')).toEqual(expect.arrayContaining(['Sinj', 'Knin', 'Novalja']));
    expect(cityNamesOf('Bosnia and Herzegovina')).toEqual(expect.arrayContaining(['Bihac', 'Neum']));
  });
});
