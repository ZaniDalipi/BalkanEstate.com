/**
 * Which picture a city shows, and what to try when it doesn't load.
 *
 * There are two independent places a city photo can come from:
 *
 *   - `city.imageUrl` — resolved on the server across the three collections
 *     that curate the same place (an admin override, the City Gallery panel,
 *     a villa destination, or the auto-seeded one). See
 *     `backend/src/services/cityPhotoService.ts`.
 *   - a stored asset named by convention, `city-{country}-{city}`, which
 *     predates the field and is still how most cities have a picture at all.
 *
 * The stored URL is tried first — that is what makes an admin's edit visible —
 * and the convention id is the fallback, so cities nobody has curated keep the
 * photo they already had. Both are returned rather than one chosen, because
 * whether an image loads is only known in the browser: the convention URL is a
 * 404 for any city without that asset, and the stored URL can point at a photo
 * since deleted from storage.
 */

import { getCityImageUrl, optimizeImageUrl } from '@/config/imageConfig';

/** Just enough of a city to find its photo. */
export interface CityPhotoSubject {
  city: string;
  country?: string;
  /** Server-resolved photo, when the city has one. */
  imageUrl?: string;
}

export interface CityImageOptions {
  width: number;
  height: number;
  quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best';
}

/** Rejects anything that has no business in an `img src`. */
function usableUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  // A newline or control character in a URL is either corrupt data or an
  // injection attempt; neither should reach the DOM.
  // eslint-disable-next-line no-control-regex
  if (/[\r\n\x00-\x1f]/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Ordered image sources for one city — most authoritative first, each already
 * sized for where it is being drawn. Never empty: the convention URL is always
 * derivable from the name, and a card that runs off the end of this list falls
 * through to Wikipedia and then to a gradient.
 */
export function cityImageSources(
  subject: CityPhotoSubject,
  options: CityImageOptions,
): string[] {
  const { width, height, quality = 'auto:good' } = options;
  const sources: string[] = [];

  const stored = usableUrl(subject.imageUrl);
  if (stored) {
    // Our own CDN URLs get resized to the box they fill; anything else (a
    // Wikipedia or Unsplash original) comes back unchanged, since we cannot
    // transform a host we don't control.
    sources.push(optimizeImageUrl(stored, {
      width, height, quality, crop: 'fill', gravity: 'auto',
    }) || stored);
  }

  const convention = getCityImageUrl(subject.city, {
    ...(subject.country ? { country: subject.country } : {}),
    width, height, quality,
  });
  if (convention !== sources[0]) sources.push(convention);

  return sources;
}
