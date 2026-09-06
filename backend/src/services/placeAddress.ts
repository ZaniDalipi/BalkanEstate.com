import fs from 'fs';
import path from 'path';

/**
 * Writing a listing address as `<place>, <city>, <country>`.
 *
 * The same shape the app shows everywhere (`src/shared/geo/placeNames.ts`),
 * implemented here for the one job the browser cannot do: rewriting addresses
 * already sitting in the database.
 *
 * The city spellings are not re-declared — they are read from the app's own
 * `src/shared/geo/placeSpellings.json`, so the migration can never spell a
 * city differently from the screen the seller filled in. That file lives in
 * the repository rather than in this package, which is fine for a script run
 * from a checkout and is the reason this module is not imported by the
 * server: it would not find the file in a deployed `dist/`.
 */

const SPELLINGS_PATH = path.resolve(
  __dirname,
  '../../../src/shared/geo/placeSpellings.json'
);

/**
 * Load the shared spelling table.
 * Throws rather than falling back to an empty table: a migration that quietly
 * rewrote every address in stripped ASCII would be worse than one that
 * refused to start.
 */
export const loadCitySpellings = (filePath: string = SPELLINGS_PATH): Record<string, string> => {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Place spellings not found at ${filePath}. Run this script from a full checkout of the repository.`
    );
  }

  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Place spellings at ${filePath} are not an object.`);
  }

  return parsed as Record<string, string>;
};

/** Lowercase, strip diacritics, collapse punctuation — the matching key. */
export const foldPlaceName = (value: string): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đð]/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Administrative dressing wrapped around a name: "Bashkia Himarë". */
const ADMIN_PREFIXES =
  /^(?:bashkia|komuna|opstina|opština|општина|община|obshtina|grad|gradska\s+opcina|gradska\s+općina|municipality\s+of|municipiul|orașul|orasul|comuna|city\s+of|dimos|δήμος)\s+/i;

const ADMIN_SUFFIXES =
  /\s+(?:municipality|opstina|opština|општина|komuna|bashkia)$/i;

/** Levels between a city and its country, which this format has no room for. */
const ADMIN_LEVELS =
  /\b(?:county|district|region|prefecture|province|state|okrug|oblast|qark(?:u)?|rreth(?:i)?|jude[țt](?:ul)?|voivodeship|regional\s+unit|administrative)\b/i;

/** True for a component that is a postcode, a plus code, or a bare number. */
const isCodeLike = (part: string): boolean =>
  /^[\d\s-]+$/.test(part) || /^[A-Z0-9]{4}\+[A-Z0-9]{2,}$/i.test(part);

export interface AddressFormatter {
  /** The local spelling of a name, or the name unchanged. */
  canonical: (name?: string | null) => string;
  /** Rewrite one listing's address. */
  format: (input: { address?: string | null; city?: string | null; country?: string | null }) => string;
}

export const createAddressFormatter = (
  spellings: Record<string, string> = loadCitySpellings()
): AddressFormatter => {
  const byKey = new Map<string, string>();
  for (const [stored, local] of Object.entries(spellings)) {
    byKey.set(foldPlaceName(stored), local);
  }

  const canonical = (name?: string | null): string => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return '';
    return byKey.get(foldPlaceName(trimmed)) ?? trimmed;
  };

  const isSame = (a: string, b: string): boolean => {
    const left = foldPlaceName(a);
    return left.length > 0 && left === foldPlaceName(b);
  };

  /**
   * Pull the street or place line out of a stored address.
   *
   * Addresses in the database are a mix of two things: a bare street line a
   * seller typed ("Knez Mihailova 42"), and a whole geocoder string the old
   * picker saved ("Himarë, Bashkia Himarë, Vlorë County, 9425, Albania").
   * Both reduce to the same thing here — everything that is not a postcode,
   * an administrative level, or a repeat of the city or country the listing
   * is already filed under.
   */
  const placePart = (address: string, city: string, country: string): string => {
    const kept: string[] = [];
    const seen = new Set<string>();

    for (const raw of address.split(',')) {
      const part = raw.trim();
      if (!part || isCodeLike(part) || ADMIN_LEVELS.test(part)) continue;

      const stripped = part.replace(ADMIN_PREFIXES, '').replace(ADMIN_SUFFIXES, '').trim();
      if (!stripped) continue;

      const name = canonical(stripped);
      if (isSame(name, city) || isSame(name, country)) continue;

      const key = foldPlaceName(name);
      if (!key || seen.has(key)) continue;

      seen.add(key);
      kept.push(name);
    }

    return kept.join(', ');
  };

  const format = ({
    address,
    city,
    country,
  }: { address?: string | null; city?: string | null; country?: string | null }): string => {
    const canonicalCity = canonical(city);
    const canonicalCountry = canonical(country);
    const place = placePart((address ?? '').trim(), canonicalCity, canonicalCountry);

    // A listing whose address said nothing but its city is written as the
    // city, rather than as an empty first line.
    return [place, canonicalCity, canonicalCountry].filter(Boolean).join(', ');
  };

  return { canonical, format };
};
