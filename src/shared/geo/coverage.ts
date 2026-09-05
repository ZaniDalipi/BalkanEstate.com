import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { normalizePlaceName } from './normalize';
import COUNTRY_NAMES from './countryNames.json';

/**
 * Where this app covers.
 *
 * Ten countries — Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Greece,
 * Kosovo, Montenegro, North Macedonia, Romania and Serbia — and nothing else
 * should ever appear in a search box. A seller cannot file a listing outside
 * them, so a suggestion from outside them is a dead end: the user picks it,
 * the map flies somewhere we have nothing, and the result is an empty page.
 *
 * The gazetteer and the geocoder proxy are already inside this fence by
 * construction — one only holds these countries, the other is restricted to
 * their ISO codes server-side. Google Places is the one source that will
 * happily answer with Türkiye or the Philippines, which is what this exists
 * to stop.
 */

/** ISO 3166-1 alpha-2 codes, lowercased, for the providers that take them. */
export const SUPPORTED_COUNTRY_CODES: readonly string[] = BALKAN_LOCATIONS
  .map((country) => country.code.toLowerCase())
  .sort();

/**
 * Every name these countries go by, folded.
 *
 * A place provider names a country in the viewer's language, so "Greece" can
 * arrive as Ελλάδα, Grecia or Greqi. `countryNames.json` collects the app's
 * own translations of all ten countries across all ten locales, plus the
 * native forms and common exonyms a map might use; folding then removes the
 * remaining differences of script and accent. A test keeps the file in step
 * with the locales.
 */
const ACCEPTED_NAMES: ReadonlySet<string> = new Set(
  Object.values(COUNTRY_NAMES as Record<string, string[]>)
    .flat()
    .map(normalizePlaceName)
    .filter(Boolean),
);

/**
 * True when `name` is one of the covered countries, whatever it is called.
 *
 * Deny by default: a name this does not recognise is treated as outside
 * coverage. That is the safe direction — the cost of wrongly rejecting a
 * country is a suggestion the user does not see, while the cost of wrongly
 * accepting one is a listing search that can only ever come back empty.
 */
export const isSupportedCountry = (name?: string | null): boolean => {
  const key = normalizePlaceName(name ?? '');
  return key.length > 0 && ACCEPTED_NAMES.has(key);
};

/** True when the ISO code is one of the covered countries'. */
export const isSupportedCountryCode = (code?: string | null): boolean =>
  !!code && SUPPORTED_COUNTRY_CODES.includes(code.trim().toLowerCase());

/**
 * True when a place with this country line may be shown.
 *
 * An empty country is allowed through: the app's own places carry their
 * country, but a street or a business from a provider sometimes does not, and
 * those have already been restricted by region code at the request. Rejecting
 * them here would throw away good results to re-check something already
 * checked.
 */
export const isPlaceInCoverage = (country?: string | null): boolean =>
  !country?.trim() || isSupportedCountry(country);
