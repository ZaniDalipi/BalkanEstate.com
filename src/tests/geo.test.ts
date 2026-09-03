import { describe, it, expect } from 'vitest';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import {
  BALKAN_LOCALITIES,
  LOCALITY_AREA_RADIUS_KM,
  MUNICIPAL_AREA_RADIUS_KM,
  findCityCentre,
  getCityAreaRadiusKm,
  getLocalitiesForCity,
  haversineDistanceKm,
  normalizePlaceName,
  searchLocalities,
} from '@/shared/geo';

const VLORE = { lat: 40.4686, lng: 19.4914 };
const HIMARE = { lat: 40.1017, lng: 19.7442 };

describe('haversineDistanceKm', () => {
  it('measures a known Albanian riviera leg', () => {
    // Vlorë → Himarë is roughly 45km as the crow flies.
    expect(haversineDistanceKm(VLORE, HIMARE)).toBeGreaterThan(40);
    expect(haversineDistanceKm(VLORE, HIMARE)).toBeLessThan(50);
  });

  it('is zero for the same point and symmetric', () => {
    expect(haversineDistanceKm(VLORE, VLORE)).toBeCloseTo(0, 6);
    expect(haversineDistanceKm(VLORE, HIMARE)).toBeCloseTo(haversineDistanceKm(HIMARE, VLORE), 6);
  });

  it('fails closed on invalid coordinates', () => {
    expect(haversineDistanceKm(VLORE, { lat: NaN, lng: 19 })).toBe(Infinity);
    expect(haversineDistanceKm(undefined as any, VLORE)).toBe(Infinity);
  });
});

describe('normalizePlaceName', () => {
  it('folds the diacritics Balkan place names are written with', () => {
    expect(normalizePlaceName('Palasë')).toBe(normalizePlaceName('Palase'));
    expect(normalizePlaceName('Himarë')).toBe('himare');
    expect(normalizePlaceName('Bečići')).toBe('becici');
    expect(normalizePlaceName('Đenovići')).toBe('denovici');
  });

  it('collapses punctuation and whitespace', () => {
    expect(normalizePlaceName('  Fushë-Krujë ')).toBe('fushe kruje');
  });
});

describe('gazetteer integrity', () => {
  it('every locality points at a real city in BALKAN_LOCATIONS', () => {
    const known = new Set(
      BALKAN_LOCATIONS.flatMap((country) =>
        country.cities.map((city) => `${normalizePlaceName(country.name)}|${normalizePlaceName(city.name)}`)
      )
    );

    const orphans = BALKAN_LOCALITIES.filter(
      (locality) =>
        !known.has(`${normalizePlaceName(locality.country)}|${normalizePlaceName(locality.city)}`)
    ).map((locality) => `${locality.name} (${locality.city}, ${locality.country})`);

    expect(orphans).toEqual([]);
  });

  it('every locality has plausible coordinates', () => {
    for (const locality of BALKAN_LOCALITIES) {
      expect(Number.isFinite(locality.lat), locality.name).toBe(true);
      expect(Number.isFinite(locality.lng), locality.name).toBe(true);
      // The Balkans sit well inside this box.
      expect(locality.lat, locality.name).toBeGreaterThan(34);
      expect(locality.lat, locality.name).toBeLessThan(49);
      expect(locality.lng, locality.name).toBeGreaterThan(12);
      expect(locality.lng, locality.name).toBeLessThan(30);
    }
  });
});

describe('getCityAreaRadiusKm', () => {
  it('gives a county seat its whole municipality', () => {
    expect(getCityAreaRadiusKm('Albania', 'Vlore')).toBe(MUNICIPAL_AREA_RADIUS_KM);
    expect(getCityAreaRadiusKm('Albania', 'Sarande')).toBe(MUNICIPAL_AREA_RADIUS_KM);
  });

  it('narrows a village or resort to its own settlement', () => {
    // The case this exists for: picking Himarë offers Himarë addresses, not
    // everything down the riviera that Vlorë County covers.
    expect(getCityAreaRadiusKm('Albania', 'Himare')).toBe(LOCALITY_AREA_RADIUS_KM);
    expect(getCityAreaRadiusKm('Albania', 'Dhermi')).toBe(LOCALITY_AREA_RADIUS_KM);
    expect(getCityAreaRadiusKm('Montenegro', 'Sveti Stefan')).toBe(LOCALITY_AREA_RADIUS_KM);
  });

  it('is spelling-insensitive', () => {
    expect(getCityAreaRadiusKm('albania', 'himarë')).toBe(getCityAreaRadiusKm('Albania', 'Himare'));
  });

  it('narrows nothing for a city it does not know', () => {
    expect(getCityAreaRadiusKm('Albania', 'Nowhere')).toBe(MUNICIPAL_AREA_RADIUS_KM);
    expect(getCityAreaRadiusKm(null, null)).toBe(MUNICIPAL_AREA_RADIUS_KM);
  });

  it('reaches every locality the gazetteer files under a county seat', () => {
    // A municipal centre must still offer the villages registered beneath it,
    // or the gazetteer would list places its own city can never surface.
    for (const locality of BALKAN_LOCALITIES) {
      const centre = findCityCentre(locality.country, locality.city);
      if (!centre || centre.tier === 'locality') continue;

      const distance = haversineDistanceKm(
        { lat: centre.lat, lng: centre.lng },
        { lat: locality.lat, lng: locality.lng }
      );
      expect(
        getCityAreaRadiusKm(locality.country, locality.city),
        `${locality.name} must be reachable from ${locality.city}`
      ).toBeGreaterThanOrEqual(distance);
    }
  });
});

describe('findCityCentre', () => {
  it('resolves a city from its name alone', () => {
    expect(findCityCentre('Albania', 'Vlore')).toMatchObject({ lat: VLORE.lat, lng: VLORE.lng });
  });

  it('returns null for unknown input', () => {
    expect(findCityCentre('Albania', 'Nowhere')).toBeNull();
    expect(findCityCentre('', '')).toBeNull();
  });
});

describe('searchLocalities', () => {
  it('finds Palasë typed without diacritics', () => {
    const [first] = searchLocalities('palase', { country: 'Albania', city: 'Vlore' });
    expect(first?.name).toBe('Palasë');
  });

  it('finds a place by an alias', () => {
    const [first] = searchLocalities('drymades', { country: 'Albania' });
    expect(first?.name).toBe('Dhërmi');
  });

  it('matches on a prefix, so results appear while typing', () => {
    const names = searchLocalities('him', { country: 'Albania' }).map((match) => match.name);
    expect(names).toContain('Himarë');
  });

  it('restricts to the selected country', () => {
    expect(searchLocalities('himare', { country: 'Croatia' })).toEqual([]);
  });

  it('drops matches beyond the allowed radius', () => {
    const nearby = searchLocalities('ksamil', { country: 'Albania', near: VLORE, maxDistanceKm: 30 });
    expect(nearby).toEqual([]);
  });

  it('ranks the selected city\'s own localities first', () => {
    // "pe" prefixes both Petrovac (Budva) and Perast (Kotor).
    const budva = { lat: 42.2864, lng: 18.84 };
    const [first] = searchLocalities('pe', { country: 'Montenegro', city: 'Budva', near: budva });
    expect(first).toMatchObject({ name: 'Petrovac', city: 'Budva' });

    const kotor = { lat: 42.4247, lng: 18.7712 };
    const [firstForKotor] = searchLocalities('pe', { country: 'Montenegro', city: 'Kotor', near: kotor });
    expect(firstForKotor).toMatchObject({ name: 'Perast', city: 'Kotor' });
  });

  it('ignores queries that are too short', () => {
    expect(searchLocalities('p', { country: 'Albania' })).toEqual([]);
    expect(searchLocalities('', {})).toEqual([]);
  });
});

describe('getLocalitiesForCity', () => {
  it('lists the riviera villages under Vlorë', () => {
    const names = getLocalitiesForCity('Albania', 'Vlore').map((locality) => locality.name);
    expect(names).toEqual(expect.arrayContaining(['Palasë', 'Dhërmi', 'Himarë', 'Qeparo', 'Borsh']));
  });

  it('returns nothing for an unknown city', () => {
    expect(getLocalitiesForCity('Albania', 'Nowhere')).toEqual([]);
  });
});
