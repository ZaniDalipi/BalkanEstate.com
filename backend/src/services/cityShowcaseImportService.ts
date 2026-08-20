import cloudinary from '../config/cloudinary';
import CityMarketData from '../models/CityMarketData';
import CityShowcase from '../models/CityShowcase';
import { apiLogger } from '../utils/logger';

/**
 * Brings the cities already in the database into the home-page gallery.
 *
 * The gallery's collection stays the single source of truth: this copies rows
 * in once, it is not a runtime fallback that reads `CityMarketData` behind the
 * gallery's back. After an import the panels are ordinary rows an admin can
 * rename, reorder, re-photograph, hide or delete, and nothing re-creates them.
 *
 * The hard part is the photo. A panel is a full-bleed image with a label on it
 * and there is no stand-in, so a city with no usable photo is reported back to
 * the admin rather than imported as a panel that would render as a grey box.
 */

/** The shape this service needs from a market-data row. */
export interface ImportableCity {
  city: string;
  country: string;
  imageUrl?: string;
  featured?: boolean;
  listingsCount?: number;
}

export interface ImportResult {
  imported: number;
  /** Already in the gallery — matched on city + country, so re-running is safe. */
  alreadyPresent: number;
  /** Cities skipped because no photo could be found for them. */
  missingPhoto: string[];
}

/** Matches `seedCityImages.ts`, which named the Cloudinary assets this way. */
function normalizeName(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Identity of a city across both collections: name + country, case-insensitive. */
export function cityKey(city: string, country: string): string {
  return `${normalizeName(city)}|${normalizeName(country)}`;
}

/**
 * Which cities are worth importing, in the order they should appear.
 *
 * Ordering matters more than it looks: the gallery shows only the first few
 * visible panels, so this is what decides which cities a visitor actually
 * sees. Featured first, then the ones with the most listings — a city with
 * nothing for sale is the last thing to put in front of a buyer.
 *
 * Pure, so the ordering can be tested without a database.
 */
export function selectImportCandidates(
  cities: ImportableCity[],
  existingKeys: ReadonlySet<string>
): ImportableCity[] {
  const seen = new Set(existingKeys);
  const candidates: ImportableCity[] = [];

  for (const row of cities) {
    const city = String(row.city ?? '').trim();
    const country = String(row.country ?? '').trim();
    // Both are required by the gallery's schema, and a duplicate inside
    // `CityMarketData` itself would otherwise import the same city twice.
    if (!city || !country) continue;
    const key = cityKey(city, country);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ ...row, city, country });
  }

  return candidates.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const listings = (b.listingsCount ?? 0) - (a.listingsCount ?? 0);
    if (listings !== 0) return listings;
    return a.city.localeCompare(b.city);
  });
}

/** True when `url` is something an `img src` can safely be pointed at. */
export function isUsablePhotoUrl(url: unknown): url is string {
  return typeof url === 'string' && /^https:\/\/\S+$/i.test(url.trim());
}

/**
 * Finds a photo for one city, or `null` if there is none.
 *
 * Two sources, in order of how much they can be trusted:
 * 1. the photo already stored on the market-data row;
 * 2. the seeded Cloudinary city library (`city-{country}-{city}`), but only
 *    after asking Cloudinary whether that asset exists — the id is derived
 *    from the name, so guessing it would produce a URL that 404s for every
 *    city the seed script never covered.
 */
export async function resolveCityPhoto(row: ImportableCity): Promise<string | null> {
  if (isUsablePhotoUrl(row.imageUrl)) return row.imageUrl.trim();

  const publicId = `city-${normalizeName(row.country)}-${normalizeName(row.city)}`;
  try {
    const resource = await cloudinary.api.resource(publicId);
    return isUsablePhotoUrl(resource?.secure_url) ? resource.secure_url : null;
  } catch {
    // Not in the library. Not an error — most databases will have cities the
    // image seed never ran for.
    return null;
  }
}

/** Resolves photos a few at a time so an import cannot hammer Cloudinary. */
const PHOTO_LOOKUP_CONCURRENCY = 5;

/** Ceiling on one import run, so a runaway collection cannot stall a request. */
const MAX_IMPORT_CANDIDATES = 200;

export async function importCitiesFromMarketData(): Promise<ImportResult> {
  const [cities, existing] = await Promise.all([
    CityMarketData.find({}, 'city country imageUrl featured listingsCount').lean(),
    CityShowcase.find({}, 'city country displayOrder').lean(),
  ]);

  const existingKeys = new Set(
    existing.map(row => cityKey(String(row.city), String(row.country)))
  );
  const candidates = selectImportCandidates(cities as ImportableCity[], existingKeys)
    .slice(0, MAX_IMPORT_CANDIDATES);

  // Counted directly rather than inferred from the candidate list, which also
  // drops nameless and duplicated rows — those are not "already present".
  const alreadyPresent = cities.filter(
    row => row.city && row.country && existingKeys.has(cityKey(String(row.city), String(row.country)))
  ).length;

  // New rows go after whatever an admin has already arranged, so importing
  // never reshuffles the panels they curated by hand.
  const highestOrder = existing.reduce(
    (max, row) => Math.max(max, Number(row.displayOrder) || 0),
    -1
  );

  const missingPhoto: string[] = [];
  const toInsert: Array<Record<string, unknown>> = [];

  for (let i = 0; i < candidates.length; i += PHOTO_LOOKUP_CONCURRENCY) {
    const batch = candidates.slice(i, i + PHOTO_LOOKUP_CONCURRENCY);
    const photos = await Promise.all(batch.map(resolveCityPhoto));

    batch.forEach((row, index) => {
      const imageUrl = photos[index];
      if (!imageUrl) {
        missingPhoto.push(`${row.city}, ${row.country}`);
        return;
      }
      toInsert.push({
        city: row.city,
        country: row.country,
        // The city's own name is what a visitor searching for it would type,
        // and it is what the search page matches listings on.
        searchQuery: row.city,
        imageUrl,
        displayOrder: highestOrder + 1 + toInsert.length,
        isActive: true,
      });
    });
  }

  if (toInsert.length > 0) await CityShowcase.insertMany(toInsert);

  apiLogger.info(
    `City showcase import: ${toInsert.length} imported, ${alreadyPresent} already present, ${missingPhoto.length} without a photo`
  );

  return { imported: toInsert.length, alreadyPresent, missingPhoto };
}
