/**
 * One photo per city, resolved across the three places a photo can live.
 *
 * The same place is curated in up to three collections — `CityMarketData`
 * (Explore Cities), `CityShowcase` (the home gallery) and `VillaDestination`
 * (the villas corridor) — and admins were uploading the same picture into each.
 * This resolves them in one documented order so a photo curated once shows up
 * everywhere it applies:
 *
 *   1. `manual`            — an admin set it on the city itself; always wins
 *   2. `city-gallery`      — the active City Gallery panel for this city
 *   3. `villa-destination` — a Villa Destination for the same place
 *   4. `auto`              — whatever the Wikipedia seeder stored on the city
 *
 * Everything is matched on a normalised (city, country) pair, so "Prishtinë",
 * "Prishtina " and "PRISHTINA" are the same place. Resolution is batched: the
 * Explore Cities list asks for ~90 cities at once, so this must be three
 * queries, not three per city.
 */

import CityMarketData from '../models/CityMarketData';
import CityShowcase from '../models/CityShowcase';
import VillaDestination from '../models/VillaDestination';
import { apiLogger } from '../utils/logger';

export type CityPhotoSource = 'manual' | 'city-gallery' | 'villa-destination' | 'auto';

export interface ResolvedCityPhoto {
  imageUrl: string;
  source: CityPhotoSource;
  credit?: string;
  creditUrl?: string;
}

export interface CityPair {
  city: string;
  country: string;
}

/** Where a photo could come from, for the admin screen to show and offer. */
export interface CityPhotoCandidates {
  manual: ResolvedCityPhoto | null;
  cityGallery: ResolvedCityPhoto | null;
  villaDestination: ResolvedCityPhoto | null;
  auto: ResolvedCityPhoto | null;
}

/**
 * Normalised place identity: lowercase, accent-stripped, punctuation-collapsed.
 * "Prishtinë" and "Prishtina" still differ in their last letter, so this is a
 * tolerant key rather than a claim that any two names are the same city.
 */
export function placeKey(city: string, country: string): string {
  return `${normalizePlace(city)}|${normalizePlace(country)}`;
}

function normalizePlace(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function usableUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Only http(s) — a data: or javascript: URL has no business in an <img src>
  // that reaches every visitor.
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

interface CityImageRow {
  city: string;
  country: string;
  imageUrl?: string;
  imageSource?: 'manual' | 'auto';
  imageCredit?: string;
}

/**
 * Photo candidates for a set of cities, keyed by `placeKey`.
 *
 * A collection that fails to load is logged and skipped rather than failing the
 * whole resolution: a missing gallery photo should degrade to the city's own
 * picture, not blank every card on the page.
 */
export async function loadCityPhotoCandidates(
  pairs: readonly CityPair[],
): Promise<Map<string, CityPhotoCandidates>> {
  const wanted = new Set(pairs.map(p => placeKey(p.city, p.country)));
  const candidates = new Map<string, CityPhotoCandidates>();

  const entry = (key: string): CityPhotoCandidates => {
    const existing = candidates.get(key);
    if (existing) return existing;
    const created: CityPhotoCandidates = {
      manual: null, cityGallery: null, villaDestination: null, auto: null,
    };
    candidates.set(key, created);
    return created;
  };
  for (const key of wanted) entry(key);

  // ── The city's own photo (manual override or auto-seeded) ──
  try {
    const rows = await CityMarketData
      .find({}, 'city country imageUrl imageSource imageCredit')
      .lean<CityImageRow[]>();

    for (const row of rows) {
      const key = placeKey(row.city, row.country);
      if (!wanted.has(key)) continue;
      const url = usableUrl(row.imageUrl);
      if (!url) continue;

      const photo: ResolvedCityPhoto = {
        imageUrl: url,
        source: row.imageSource === 'manual' ? 'manual' : 'auto',
        ...(nonEmpty(row.imageCredit) ? { credit: nonEmpty(row.imageCredit) } : {}),
      };
      if (photo.source === 'manual') entry(key).manual = photo;
      else entry(key).auto = photo;
    }
  } catch (error) {
    apiLogger.error('City photo resolution: CityMarketData lookup failed', error);
  }

  // ── The home gallery panel for the same city ──
  try {
    const rows = await CityShowcase
      .find({ isActive: true }, 'city country imageUrl imageCredit')
      .lean<Array<{ city: string; country: string; imageUrl?: string; imageCredit?: string }>>();

    for (const row of rows) {
      const key = placeKey(row.city, row.country);
      if (!wanted.has(key)) continue;
      const url = usableUrl(row.imageUrl);
      if (!url) continue;
      // First active panel wins; a second panel for the same city is a
      // duplicate the gallery itself would also show twice.
      if (entry(key).cityGallery) continue;
      entry(key).cityGallery = {
        imageUrl: url,
        source: 'city-gallery',
        ...(nonEmpty(row.imageCredit) ? { credit: nonEmpty(row.imageCredit) } : {}),
      };
    }
  } catch (error) {
    apiLogger.error('City photo resolution: CityShowcase lookup failed', error);
  }

  // ── A villa destination for the same place ──
  try {
    const rows = await VillaDestination
      .find({ isActive: true }, 'name country imageUrl imageCredit imageCreditUrl imageCity imageCountry')
      .lean<Array<{
        name: string; country: string; imageUrl?: string;
        imageCredit?: string; imageCreditUrl?: string;
        imageCity?: string; imageCountry?: string;
      }>>();

    for (const row of rows) {
      const url = usableUrl(row.imageUrl);
      if (!url) continue;

      // A destination names its place in `name`, and may separately record
      // which seeded city photo it borrowed — either can identify the city.
      const keys = [
        placeKey(row.name, row.country),
        ...(row.imageCity ? [placeKey(row.imageCity, row.imageCountry ?? row.country)] : []),
      ];

      for (const key of keys) {
        if (!wanted.has(key) || entry(key).villaDestination) continue;
        entry(key).villaDestination = {
          imageUrl: url,
          source: 'villa-destination',
          ...(nonEmpty(row.imageCredit) ? { credit: nonEmpty(row.imageCredit) } : {}),
          ...(nonEmpty(row.imageCreditUrl) ? { creditUrl: nonEmpty(row.imageCreditUrl) } : {}),
        };
      }
    }
  } catch (error) {
    apiLogger.error('City photo resolution: VillaDestination lookup failed', error);
  }

  return candidates;
}

/** The documented precedence, applied to one city's candidates. */
export function pickCityPhoto(candidates: CityPhotoCandidates | undefined): ResolvedCityPhoto | null {
  if (!candidates) return null;
  return candidates.manual
    ?? candidates.cityGallery
    ?? candidates.villaDestination
    ?? candidates.auto
    ?? null;
}

/**
 * Resolved photo per city, keyed by `placeKey`. Cities with no photo anywhere
 * are absent from the map — the frontend then falls back to its own chain
 * (convention CDN path → Wikipedia → gradient).
 */
export async function resolveCityPhotos(
  pairs: readonly CityPair[],
): Promise<Map<string, ResolvedCityPhoto>> {
  if (pairs.length === 0) return new Map();

  const candidates = await loadCityPhotoCandidates(pairs);
  const resolved = new Map<string, ResolvedCityPhoto>();

  for (const [key, entry] of candidates) {
    const photo = pickCityPhoto(entry);
    if (photo) resolved.set(key, photo);
  }

  return resolved;
}

/** Convenience for a single city. */
export async function resolveCityPhoto(city: string, country: string): Promise<ResolvedCityPhoto | null> {
  const resolved = await resolveCityPhotos([{ city, country }]);
  return resolved.get(placeKey(city, country)) ?? null;
}
