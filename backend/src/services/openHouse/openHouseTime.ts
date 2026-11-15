/**
 * Open houses are stored as UTC instants. Emails and push messages are read
 * away from the site, so they spell the time out in the listing's own zone.
 */

const EET_COUNTRIES = new Set(['greece', 'bulgaria', 'romania', 'gr', 'bg', 'ro']);

export function listingTimeZone(country: string | undefined): string {
  const key = (country ?? '').trim().toLowerCase();
  return EET_COUNTRIES.has(key) ? 'Europe/Bucharest' : 'Europe/Belgrade';
}

/** dd/mm/yyyy in the given zone — the site's one date format. */
function dmy(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')}`;
}

const longDay = (at: Date, timeZone: string): string =>
  `${new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone }).format(at)} ${dmy(at, timeZone)}`;

/** "Saturday 14/03/2026, 11:00–13:00" in the listing's zone. */
export function formatOpenHouseWindow(startsAt: Date, endsAt: Date, country?: string): string {
  const timeZone = listingTimeZone(country);
  const day = longDay(startsAt, timeZone);
  const time = (d: Date) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d);
  return `${day}, ${time(startsAt)}–${time(endsAt)}`;
}

/** "Saturday 14/03/2026, 18:00" in the listing's zone — for a single moment like an auction. */
export function formatInListingZone(at: Date, country?: string): string {
  const timeZone = listingTimeZone(country);
  const day = longDay(at, timeZone);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(at);
  return `${day}, ${time}`;
}
