import { toIntlLocale } from '@/src/shared/utils/intlLocale';

/**
 * Open houses are shown in the viewer's own clock, like every other time on
 * the site. Returns the two parts a row shows: the day and the time span.
 */
export function formatOpenHouseWindow(
  startsAt: string,
  endsAt: string,
  lang: string,
  timeZone?: string,
): { day: string; time: string } {
  const locale = toIntlLocale(lang);
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(start);
  const hm = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone });
  return { day, time: `${hm.format(start)}–${hm.format(end)}` };
}

export type OpenHouseWhen = 'now' | 'today' | 'tomorrow' | null;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** A short, friendly hint next to the date: happening now, today or tomorrow. */
export function openHouseWhen(startsAt: string, endsAt: string, now: Date): OpenHouseWhen {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (start <= now && now < end) return 'now';
  if (end <= now) return null;
  if (dayKey(start) === dayKey(now)) return 'today';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return dayKey(start) === dayKey(tomorrow) ? 'tomorrow' : null;
}
