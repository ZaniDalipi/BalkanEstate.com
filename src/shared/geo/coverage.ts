import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';

/**
 * Where this app covers.
 *
 * Ten countries, and nothing else should ever appear in a search box. A
 * seller cannot file a listing outside them, so a suggestion from outside is
 * a dead end: the user picks it, the map flies somewhere we have nothing, and
 * the page comes back empty.
 *
 * The list is not written here. It is derived from `BALKAN_LOCATIONS` — the
 * same data that decides which countries the create-listing form offers — so
 * coverage cannot drift from what the app can actually store, and adding a
 * country is one edit rather than three.
 *
 * Everything is done with ISO codes rather than country names. Names arrive
 * from a place provider in the viewer's language — Greece as Ελλάδα, Grecia
 * or Greqi — so matching them means keeping a list of translations that goes
 * stale the moment a provider changes its wording. Codes are the same in
 * every language, and both providers accept them as a restriction, which
 * means the filtering happens at the source instead of being guessed at
 * afterwards.
 */

/** ISO 3166-1 alpha-2, lowercased, as every provider wants them. */
export const SUPPORTED_COUNTRY_CODES: readonly string[] = BALKAN_LOCATIONS
  .map((country) => country.code.toLowerCase())
  .sort();

const SUPPORTED = new Set(SUPPORTED_COUNTRY_CODES);

/**
 * True when the ISO code is one of the covered countries'.
 *
 * A missing code is not covered. That is the safe direction: a suggestion
 * wrongly hidden costs one row, while one wrongly shown costs a search that
 * can only ever come back empty.
 */
export const isSupportedCountryCode = (code?: string | null): boolean =>
  !!code && SUPPORTED.has(code.trim().toLowerCase());
