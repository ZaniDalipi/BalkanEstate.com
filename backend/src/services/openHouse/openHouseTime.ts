/**
 * Open houses are stored as UTC instants. Emails and push messages are read
 * away from the site, so they spell the time out in the listing's own zone.
 */

const EET_COUNTRIES = new Set(['greece', 'bulgaria', 'romania', 'gr', 'bg', 'ro']);

export function listingTimeZone(country: string | undefined): string {
  const key = (country ?? '').trim().toLowerCase();
  return EET_COUNTRIES.has(key) ? 'Europe/Bucharest' : 'Europe/Belgrade';
}

/** "Saturday 14 March, 11:00–13:00" in the listing's zone. */
export function formatOpenHouseWindow(startsAt: Date, endsAt: Date, country?: string): string {
  const timeZone = listingTimeZone(country);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(startsAt);
  const time = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d);
  return `${day}, ${time(startsAt)}–${time(endsAt)}`;
}

/** "Saturday 14 March, 18:00" in the listing's zone — for a single moment like an auction. */
export function formatInListingZone(at: Date, country?: string): string {
  const timeZone = listingTimeZone(country);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(at);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(at);
  return `${day}, ${time}`;
}
