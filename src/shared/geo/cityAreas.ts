import { BALKAN_LOCATIONS, type CityData } from '@/utils/balkanLocations';
import { haversineDistanceKm, type Coordinates } from './distance';
import { normalizePlaceName } from './normalize';
import { BALKAN_LOCALITIES } from './localities';

/**
 * How far from a city centre a listing may be pinned.
 *
 * A Balkan "city" in this app is really a market area, not a municipal
 * boundary: a seller who picks Vlorë may well be listing in Dhërmi or Himarë,
 * 30–50km down the riviera, and a seller who picks Burgas may be in Tsarevo,
 * 60km south. The old flat 30km limit rejected all of those, which is what
 * made the picker feel broken.
 */

/** Applies to any city without an explicit entry below. */
export const DEFAULT_CITY_AREA_RADIUS_KM = 60;

/**
 * Never allow a radius past this, whatever the data says — it is roughly the
 * width of the smaller countries here, and past it "nearby" stops meaning
 * anything.
 */
export const MAX_CITY_AREA_RADIUS_KM = 120;

/** Buffer added beyond the farthest known locality of a city. */
const LOCALITY_BUFFER_KM = 15;

/**
 * Explicit radii for cities whose real market area is unusually large —
 * long coastal strips, sprawling capitals, mountain districts and islands.
 * Everything else uses `DEFAULT_CITY_AREA_RADIUS_KM`.
 */
const CITY_AREA_RADIUS_OVERRIDES: Record<string, Record<string, number>> = {
  albania: {
    // Vlorë County runs from Nartë down to Lukovë — Himarë alone is ~46km out.
    vlore: 90,
    sarande: 70,
    tirana: 70,
    durres: 65,
    shkoder: 80,
    gjirokaster: 70,
    kukes: 70,
    peshkopi: 70,
    korce: 70,
  },
  greece: {
    athens: 80,
    thessaloniki: 80,
    heraklion: 80,
    chania: 80,
    rhodes: 70,
    corfu: 60,
    lesvos: 70,
    ioannina: 70,
    kalamata: 70,
    patras: 70,
  },
  croatia: {
    zagreb: 70,
    split: 70,
    dubrovnik: 80,
    zadar: 70,
    rijeka: 70,
    pula: 65,
    sibenik: 65,
    makarska: 65,
  },
  bulgaria: {
    // Burgas' coast reaches Ahtopol, ~80km south.
    burgas: 95,
    varna: 90,
    sofia: 75,
    blagoevgrad: 80,
    plovdiv: 70,
  },
  romania: {
    // Constanța's resort strip reaches Vama Veche at the Bulgarian border.
    constanta: 80,
    bucharest: 75,
    brasov: 70,
    clujnapoca: 70,
    timisoara: 70,
  },
  serbia: {
    belgrade: 75,
    'novi sad': 65,
    uzice: 70,
    kraljevo: 80,
  },
  'bosnia and herzegovina': {
    sarajevo: 70,
    mostar: 75,
    'banja luka': 70,
  },
  montenegro: {
    podgorica: 70,
    bar: 65,
    budva: 60,
    kotor: 60,
    'herceg novi': 60,
    zabljak: 70,
  },
  'north macedonia': {
    skopje: 70,
    ohrid: 65,
    bitola: 65,
  },
  kosovo: {
    prishtina: 60,
    prizren: 60,
    peja: 60,
  },
};

/**
 * Radius implied by the city's own gazetteer entries: no locality this app
 * lists under a city may ever fall outside that city's allowed area. Computed
 * once at module load so the configured radii above can never silently drift
 * behind the locality data.
 */
const localityRadiusByCity = ((): Map<string, number> => {
  const radii = new Map<string, number>();
  const centres = new Map<string, CityData>();

  for (const country of BALKAN_LOCATIONS) {
    for (const city of country.cities) {
      centres.set(`${normalizePlaceName(country.name)}|${normalizePlaceName(city.name)}`, city);
    }
  }

  for (const locality of BALKAN_LOCALITIES) {
    const key = `${normalizePlaceName(locality.country)}|${normalizePlaceName(locality.city)}`;
    const centre = centres.get(key);
    if (!centre) continue; // Unknown parent city — validated by the geo unit tests.

    const distanceKm = haversineDistanceKm(
      { lat: centre.lat, lng: centre.lng },
      { lat: locality.lat, lng: locality.lng }
    );
    if (!Number.isFinite(distanceKm)) continue;

    radii.set(key, Math.max(radii.get(key) ?? 0, distanceKm + LOCALITY_BUFFER_KM));
  }

  return radii;
})();

/**
 * The radius, in km, within which a listing may be pinned for `city`.
 * Returns the largest of: the configured override (or the default) and the
 * distance to the city's farthest known locality, capped at
 * `MAX_CITY_AREA_RADIUS_KM`.
 */
export const getCityAreaRadiusKm = (country?: string | null, city?: string | null): number => {
  const normalizedCountry = normalizePlaceName(country ?? '');
  const normalizedCity = normalizePlaceName(city ?? '');

  const configured =
    CITY_AREA_RADIUS_OVERRIDES[normalizedCountry]?.[normalizedCity] ?? DEFAULT_CITY_AREA_RADIUS_KM;
  const fromLocalities = localityRadiusByCity.get(`${normalizedCountry}|${normalizedCity}`) ?? 0;

  return Math.min(Math.max(configured, fromLocalities), MAX_CITY_AREA_RADIUS_KM);
};

export interface CityAreaCheck {
  /** False only when a city centre is known and the pin falls outside its radius. */
  isWithinArea: boolean;
  distanceKm: number;
  radiusKm: number;
}

/**
 * Check a candidate pin against a city's area.
 *
 * Fails open: with no city selected, or no centre coordinates for it, there is
 * nothing to measure against and the pin is accepted. Only a known centre plus
 * a pin beyond its radius counts as out of area.
 */
export const checkCityArea = (
  pin: Coordinates,
  cityCentre: Coordinates | null | undefined,
  { country, city }: { country?: string | null; city?: string | null } = {}
): CityAreaCheck => {
  const radiusKm = getCityAreaRadiusKm(country, city);

  if (!cityCentre || !Number.isFinite(cityCentre.lat) || !Number.isFinite(cityCentre.lng)) {
    return { isWithinArea: true, distanceKm: 0, radiusKm };
  }

  const distanceKm = haversineDistanceKm(cityCentre, pin);
  return { isWithinArea: distanceKm <= radiusKm, distanceKm, radiusKm };
};

/** Look up a city's centre coordinates from the canonical country/city list. */
export const findCityCentre = (country?: string | null, city?: string | null): CityData | null => {
  const normalizedCountry = normalizePlaceName(country ?? '');
  const normalizedCity = normalizePlaceName(city ?? '');
  if (!normalizedCountry || !normalizedCity) return null;

  const match = BALKAN_LOCATIONS.find((entry) => normalizePlaceName(entry.name) === normalizedCountry);
  return match?.cities.find((entry) => normalizePlaceName(entry.name) === normalizedCity) ?? null;
};
