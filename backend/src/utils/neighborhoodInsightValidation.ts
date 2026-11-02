/**
 * Server-side validation for neighborhood-insight requests.
 *
 * Pure functions, no I/O. The client validates too, but the server never
 * trusts it: the address, city, country and language are interpolated into an
 * AI prompt, so they are length-capped, stripped of control characters and (for
 * the language) matched against an allow-list.
 */

export const MAX_PLACE_TEXT_LENGTH = 200;

const LISTING_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Language names the AI prompt may be asked to write in (mirrors the UI's language list). */
export const INSIGHT_LANGUAGES: readonly string[] = [
  'English', 'Albanian', 'Macedonian', 'Serbian', 'Croatian', 'Slovenian', 'Bosnian',
  'Montenegrin', 'Bulgarian', 'Romanian', 'Greek', 'Turkish', 'German', 'Italian', 'French',
];

export interface InsightRequest {
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
  language: string;
  /** Present when the caller wants the insight kept for that listing. */
  listingId: string | null;
}

export type InsightRequestResult =
  | { ok: true; value: InsightRequest }
  | { ok: false; field: string; message: string };

/** The listing id when it is a safe, plausible id, otherwise null. */
export const parseListingId = (value: unknown): string | null =>
  typeof value === 'string' && LISTING_ID_PATTERN.test(value) ? value : null;

const cleanText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(CONTROL_CHARS, ' ').trim() : '';

const fail = (field: string, message: string): InsightRequestResult => ({ ok: false, field, message });

export function parseInsightRequest(body: unknown): InsightRequestResult {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const { lat, lng } = input;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fail('coordinates', 'Latitude and longitude must be numbers');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return fail('coordinates', 'Invalid coordinates');
  }

  const text: Record<'address' | 'city' | 'country', string> = {
    address: cleanText(input.address),
    city: cleanText(input.city),
    country: cleanText(input.country),
  };
  for (const field of ['address', 'city', 'country'] as const) {
    if (!text[field]) return fail(field, `Missing required field: ${field}`);
    if (text[field].length > MAX_PLACE_TEXT_LENGTH) {
      return fail(field, `${field} must be at most ${MAX_PLACE_TEXT_LENGTH} characters`);
    }
  }

  const language = input.language === undefined ? 'English' : input.language;
  if (typeof language !== 'string' || !INSIGHT_LANGUAGES.includes(language)) {
    return fail('language', 'Unsupported language');
  }

  let listingId: string | null = null;
  if (input.listingId !== undefined) {
    listingId = parseListingId(input.listingId);
    if (!listingId) return fail('listingId', 'Invalid listingId');
  }

  return { ok: true, value: { lat, lng, ...text, language, listingId } };
}
