import { describe, it, expect } from 'vitest';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import {
  BALKAN_LOCALITIES,
  DEFAULT_CITY_AREA_RADIUS_KM,
  MAX_CITY_AREA_RADIUS_KM,
  checkCityArea,
  findCityCentre,
  getCityAreaRadiusKm,
  getLocalitiesForCity,
  haversineDistanceKm,
  normalizePlaceName,
  searchLocalities,
} from '@/shared/geo';

const VLORE = { lat: 40.4686, lng: 19.4914 };
const PALASE = { lat: 40.2033, lng: 19.5967 };
const HIMARE = { lat: 40.1017, lng: 19.7442 };
const BORSH = { lat: 40.05, lng: 19.85 };

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
  it('covers the whole Vlorë riviera, the case the old 30km limit broke', () => {
    const radius = getCityAreaRadiusKm('Albania', 'Vlore');
    expect(radius).toBeGreaterThanOrEqual(haversineDistanceKm(VLORE, HIMARE));
    expect(radius).toBeGreaterThanOrEqual(haversineDistanceKm(VLORE, BORSH));
  });

  it('falls back to the default for a city with no override', () => {
    expect(getCityAreaRadiusKm('Kosovo', 'Shtime')).toBe(DEFAULT_CITY_AREA_RADIUS_KM);
  });

  it('never exceeds the cap', () => {
    for (const country of BALKAN_LOCATIONS) {
      for (const city of country.cities) {
        expect(getCityAreaRadiusKm(country.name, city.name)).toBeLessThanOrEqual(MAX_CITY_AREA_RADIUS_KM);
      }
    }
  });

  it('is spelling-insensitive', () => {
    expect(getCityAreaRadiusKm('albania', 'vlorë')).toBe(getCityAreaRadiusKm('Albania', 'Vlore'));
  });

  it('always reaches every locality registered under a city', () => {
    for (const locality of BALKAN_LOCALITIES) {
      const centre = findCityCentre(locality.country, locality.city);
      if (!centre) continue;

      const distance = haversineDistanceKm(
        { lat: centre.lat, lng: centre.lng },
        { lat: locality.lat, lng: locality.lng }
      );
      expect(
        getCityAreaRadiusKm(locality.country, locality.city),
        `${locality.name} must be selectable under ${locality.city}`
      ).toBeGreaterThanOrEqual(distance);
    }
  });
});

describe('checkCityArea', () => {
  it('accepts Palasë and Himarë for a Vlorë listing', () => {
    expect(checkCityArea(PALASE, VLORE, { country: 'Albania', city: 'Vlore' }).isWithinArea).toBe(true);
    expect(checkCityArea(HIMARE, VLORE, { country: 'Albania', city: 'Vlore' }).isWithinArea).toBe(true);
  });

  it('still rejects a pin in a different part of the country', () => {
    const tirana = { lat: 41.3275, lng: 19.8187 };
    const check = checkCityArea(tirana, VLORE, { country: 'Albania', city: 'Vlore' });
    expect(check.isWithinArea).toBe(false);
    expect(check.distanceKm).toBeGreaterThan(check.radiusKm);
  });

  it('fails open when the city centre is unknown', () => {
    expect(checkCityArea(HIMARE, null, { country: 'Albania', city: 'Vlore' }).isWithinArea).toBe(true);
    expect(checkCityArea(HIMARE, { lat: NaN, lng: NaN }).isWithinArea).toBe(true);
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
