import type { BusinessListing } from '@/src/shared/types/businessListing.types';

/** Lower-case, accents removed — "Vlorë" and "vlore" compare equal. */
const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** "Vlore, Albania" — the short place line under the name. */
export const shortLocation = (l: Pick<BusinessListing, 'city' | 'country'>): string =>
  [l.city, l.country].filter(Boolean).join(', ');

/**
 * The street address with the city and country added only when the address
 * doesn't already name them (map-picked addresses usually do).
 */
export function fullAddress(l: Pick<BusinessListing, 'address' | 'city' | 'country'>): string {
  const address = l.address?.trim();
  if (!address) return shortLocation(l);
  const folded = fold(address);
  const extra = [l.city, l.country].filter((part) => part && !folded.includes(fold(part)));
  return [address, ...extra].join(', ');
}

/** Full years since the business was founded; null when unknown or in the future. */
export function yearsInBusiness(yearEstablished: number | undefined, now: Date): number | null {
  if (!yearEstablished) return null;
  const years = now.getFullYear() - yearEstablished;
  return years >= 0 ? years : null;
}

/** Google Maps directions to the pin, or to the address when there is no pin. */
export function directionsUrl(l: Pick<BusinessListing, 'latitude' | 'longitude' | 'address' | 'city' | 'country'>): string {
  const destination = l.latitude != null && l.longitude != null
    ? `${l.latitude},${l.longitude}`
    : encodeURIComponent(fullAddress(l));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/** A link that always opens the site, whether or not the owner typed "https://". */
export const websiteHref = (url: string): string => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

/** "reginaconstruction.al" — the site as people say it. */
export const websiteLabel = (url: string): string =>
  url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');

/** "vlore" → "Vlore"; text the owner already capitalised is left alone. */
export const capitalizeWords = (s: string): string =>
  s === s.toLowerCase() ? s.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase()) : s;

const LANGUAGE_CODES: Record<string, string> = {
  Albanian: 'sq', Bosnian: 'bs', Bulgarian: 'bg', Croatian: 'hr', English: 'en', German: 'de', Greek: 'el',
  Hungarian: 'hu', Italian: 'it', Macedonian: 'mk', Montenegrin: 'cnr', Romanian: 'ro', Serbian: 'sr',
  Slovenian: 'sl', Turkish: 'tr', French: 'fr', Russian: 'ru', Arabic: 'ar',
};

/** A stored language name ("Italian") in the reader's language ("Italisht"). */
export function languageLabel(name: string, locale: string): string {
  const code = LANGUAGE_CODES[name];
  if (!code || typeof Intl === 'undefined' || !('DisplayNames' in Intl)) return name;
  try {
    const label = new Intl.DisplayNames([locale], { type: 'language', fallback: 'none' }).of(code);
    return label ? label.charAt(0).toLocaleUpperCase(locale) + label.slice(1) : name;
  } catch {
    return name;
  }
}
