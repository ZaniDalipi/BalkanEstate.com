import { BALKAN_LOCATIONS, type CityData } from '@/utils/balkanLocations';
import { normalizePlaceName } from './normalize';
import type { Coordinates } from './distance';

/**
 * Read access to the canonical country/city list.
 *
 * `BALKAN_LOCATIONS` is the list the create-listing form offers a seller, so
 * anything built on top of these helpers offers exactly the same cities — an
 * admin cannot curate a city a seller can never file a listing under, and the
 * two lists cannot drift because there is only one list.
 *
 * Lookups are by normalised name (`normalizePlaceName`), so "Vlorë", "vlore"
 * and " Vlore " all reach the same entry.
 */

const citiesByCountry = new Map<string, CityData[]>(
  BALKAN_LOCATIONS.map((country) => [normalizePlaceName(country.name), country.cities])
);

/**
 * The canonical cities of one country, in the order the list declares them.
 * Unknown or empty country → no cities, never a throw: callers render a picker
 * from this and an empty picker is the honest answer for a country we hold no
 * data for.
 */
export const getCountryCities = (country?: string | null): readonly CityData[] =>
  citiesByCountry.get(normalizePlaceName(country ?? '')) ?? [];

/** Canonical names only, sorted for display. */
export const getCountryCityNames = (country?: string | null): string[] =>
  getCountryCities(country)
    .map((city) => city.name)
    .sort((a, b) => a.localeCompare(b));

/**
 * A city's centre coordinates, looked up by country and city name.
 * Returns null rather than a guess when either name is unknown, so callers can
 * fall back to a country centre or leave the map where it is.
 */
export const findCityCentre = (country?: string | null, city?: string | null): CityData | null => {
  const normalizedCity = normalizePlaceName(city ?? '');
  if (!normalizedCity) return null;

  return (
    getCountryCities(country).find((entry) => normalizePlaceName(entry.name) === normalizedCity) ?? null
  );
};

/**
 * A starting point for a map of `country`: the mean of its listed city
 * coordinates.
 *
 * Deliberately not a geographic centroid — it is the centre of where this app
 * actually has cities, which is what a map opening on a country should frame.
 * Returns null for a country with no cities on record.
 */
export const findCountryCentre = (country?: string | null): Coordinates | null => {
  const cities = getCountryCities(country);
  if (cities.length === 0) return null;

  const total = cities.reduce(
    (sum, city) => ({ lat: sum.lat + city.lat, lng: sum.lng + city.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: total.lat / cities.length, lng: total.lng / cities.length };
};
