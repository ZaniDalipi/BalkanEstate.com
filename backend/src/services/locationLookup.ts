import { geocodeAddress } from './geocodingService';

/** Maps URL-style city slugs (as found in scraper URLs) to canonical city names. */
export const CITY_SLUG_MAP: Record<string, string> = {
  beograd: 'Belgrade',
  belgrade: 'Belgrade',
  zagreb: 'Zagreb',
  sarajevo: 'Sarajevo',
  ljubljana: 'Ljubljana',
  skopje: 'Skopje',
  podgorica: 'Podgorica',
  tirana: 'Tirana',
  sofia: 'Sofia',
  novi_sad: 'Novi Sad',
  'novi-sad': 'Novi Sad',
  nis: 'Niš',
  split: 'Split',
  rijeka: 'Rijeka',
  mostar: 'Mostar',
  banja_luka: 'Banja Luka',
  'banja-luka': 'Banja Luka',
  pristina: 'Pristina',
  ohrid: 'Ohrid',
  kotor: 'Kotor',
  dubrovnik: 'Dubrovnik',
};

/** Maps URL-style country slugs to canonical country names. */
export const COUNTRY_SLUG_MAP: Record<string, string> = {
  srbija: 'Serbia',
  serbia: 'Serbia',
  hrvatska: 'Croatia',
  croatia: 'Croatia',
  bosna: 'Bosnia and Herzegovina',
  'bosnia-and-herzegovina': 'Bosnia and Herzegovina',
  slovenija: 'Slovenia',
  slovenia: 'Slovenia',
  makedonija: 'North Macedonia',
  'north-macedonia': 'North Macedonia',
  crna_gora: 'Montenegro',
  'crna-gora': 'Montenegro',
  montenegro: 'Montenegro',
  albanija: 'Albania',
  albania: 'Albania',
  bugarska: 'Bulgaria',
  bulgaria: 'Bulgaria',
  kosovo: 'Kosovo',
};

/** Resolved geographic location with optional display metadata. */
export interface LocationResult {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  displayName?: string;
}

/**
 * Look up geographic coordinates for a full address string, delegating to geocodingService.
 * Returns null if the address cannot be resolved.
 */
export const lookupLocation = async (
  address: string,
  city?: string,
  country?: string
): Promise<LocationResult | null> => {
  const result = await geocodeAddress(address, city, country);
  if (!result) return null;
  return {
    lat: result.lat,
    lng: result.lng,
    city,
    country,
    displayName: result.display_name,
  };
};

/**
 * Look up geographic coordinates for a city and optional country, delegating to geocodingService.
 * Returns null if the city cannot be resolved.
 */
export const lookupCity = async (
  city: string,
  country?: string
): Promise<LocationResult | null> => {
  const result = await geocodeAddress(undefined, city, country);
  if (!result) return null;
  return {
    lat: result.lat,
    lng: result.lng,
    city,
    country,
    displayName: result.display_name,
  };
};
