import { toIntlLocale } from '@/src/shared/utils/intlLocale';
import { formatOpenHouseWindow, openHouseWhen, type OpenHouseWhen } from '@/src/features/open-houses/utils/openHouseFormat';
import type { ListingEvent } from '../types';

/** "Sat 21 Nov · 18:00" in the viewer's clock — an auction is one moment. */
export function formatEventMoment(iso: string, lang: string, timeZone?: string): { day: string; time: string } {
  const locale = toIntlLocale(lang);
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(d),
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(d),
  };
}

/** Day and time text for any event: a span for open houses, a moment for auctions. */
export function eventWhen(e: ListingEvent, lang: string, timeZone?: string): { day: string; time: string } {
  return e.kind === 'openHouse'
    ? formatOpenHouseWindow(e.startsAt, e.endsAt, lang, timeZone)
    : formatEventMoment(e.startsAt, lang, timeZone);
}

/** now / today / tomorrow, or null — for both kinds. */
export function eventRelative(e: ListingEvent, now: Date): OpenHouseWhen {
  const end = e.endsAt ?? new Date(Date.parse(e.startsAt) + 60 * 60 * 1000).toISOString();
  return openHouseWhen(e.startsAt, end, now);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** The target has been reached. */
  done: boolean;
}

/** Time left until `target`, split for display. */
export function countdownParts(target: string, now: Date): CountdownParts {
  const ms = Date.parse(target) - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60, done: false };
}

/** Google Maps directions to the home (works on phones and desktop). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
}

/** Only http(s) links are ever rendered as a link (the server checks too). */
export function safeHttpUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}
