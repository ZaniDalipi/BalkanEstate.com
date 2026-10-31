/**
 * A unit's 360° virtual tour: its own link (set in the unit editor) or, when it
 * has none, the tour of the listing it is linked to. Links are shown as "open in
 * a new tab", so only plain http(s) addresses are accepted — never javascript:,
 * data: or credentials in the URL.
 */
export const TOUR_URL_MAX_LENGTH = 2000;

/** Why a tour link can't be used, or null when it can. */
export function tourUrlProblem(value: string): string | null {
  if (value.length > TOUR_URL_MAX_LENGTH) return `virtualTourUrl must be at most ${TOUR_URL_MAX_LENGTH} characters`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'virtualTourUrl must be a full web address';
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'virtualTourUrl must start with http:// or https://';
  if (url.username || url.password) return 'virtualTourUrl must not contain a user name or password';
  if (!url.hostname.includes('.')) return 'virtualTourUrl must name a web site';
  return null;
}

export type TourSource = 'unit' | 'listing';

/**
 * The tour buyers see for a unit: its own, else the first usable tour among its
 * public listings (the primary listing first).
 */
export function effectiveTour(
  ownUrl: unknown,
  listings: Array<{ id: string; virtualTour360Url?: unknown }>,
  primaryId?: string
): { url: string; source: TourSource } | null {
  if (typeof ownUrl === 'string' && ownUrl && !tourUrlProblem(ownUrl)) return { url: ownUrl, source: 'unit' };
  const ordered = primaryId ? [...listings].sort((a, b) => Number(b.id === primaryId) - Number(a.id === primaryId)) : listings;
  for (const l of ordered) {
    const url = typeof l.virtualTour360Url === 'string' ? l.virtualTour360Url.trim() : '';
    if (url && !tourUrlProblem(url)) return { url, source: 'listing' };
  }
  return null;
}
