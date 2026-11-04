/**
 * Opening hours as owners type them ("09:00 - 17:00", "9-17", "08:00-13:00, 15:00-19:00",
 * "24h", "Closed") turned into an honest "open now / opens at" answer.
 * When a day's text can't be read, the status says so instead of guessing.
 */

export const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
export type BusinessHours = Partial<Record<WeekDay, string>>;

/** Minutes since midnight; `close` may pass 1440 for a range that runs past midnight. */
export interface TimeRange {
  open: number;
  close: number;
}

export type ParsedDay = { kind: 'closed' } | { kind: 'ranges'; ranges: TimeRange[] } | { kind: 'unreadable'; text: string };

export type OpenStatus =
  | { kind: 'open'; closesAt: string | null }
  | { kind: 'closed'; opensAt: string; opensDay: 'today' | 'tomorrow' | WeekDay }
  | { kind: 'closedToday' }
  | { kind: 'unreadable'; text: string }
  | { kind: 'unknown' };

const CLOSED_WORDS = /^(closed|close|zatvoreno|mbyllur|затворено|κλειστό|inchis|închis|zatvoren|-)$/i;
const ALL_DAY = /^(24\s*h|24\s*\/\s*7|24 hours|non-?stop|0?0[:.]?0{0,2}\s*[-–—]\s*24[:.]?0{0,2})$/i;
const TIME = '(\\d{1,2})(?:[:.](\\d{2}))?';
const RANGE = new RegExp(`^${TIME}\\s*(?:[-–—]|to|deri|do)\\s*${TIME}$`, 'i');

const toMinutes = (h: string, m?: string): number | null => {
  const hours = Number(h);
  const minutes = m ? Number(m) : 0;
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
};

/** "HH:MM" for minutes since midnight (wraps past midnight). */
export const formatMinutes = (total: number): string => {
  const m = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function parseDayHours(text: string | undefined): ParsedDay {
  const value = (text ?? '').trim();
  if (!value || CLOSED_WORDS.test(value)) return { kind: 'closed' };
  if (ALL_DAY.test(value)) return { kind: 'ranges', ranges: [{ open: 0, close: 1440 }] };
  const ranges: TimeRange[] = [];
  for (const part of value.split(/\s*[,;/&]\s*|\s+(?:and|dhe|i)\s+/i)) {
    const match = RANGE.exec(part.trim());
    if (!match) return { kind: 'unreadable', text: value };
    const open = toMinutes(match[1], match[2]);
    let close = toMinutes(match[3], match[4]);
    if (open === null || close === null) return { kind: 'unreadable', text: value };
    if (close <= open) close += 1440; // e.g. 18:00 - 02:00
    ranges.push({ open, close });
  }
  return { kind: 'ranges', ranges };
}

/** The week day of a date, Monday-first naming. */
export const weekDayOf = (date: Date): WeekDay => WEEK_DAYS[(date.getDay() + 6) % 7];

export const hasAnyHours = (hours: BusinessHours | undefined): boolean =>
  !!hours && WEEK_DAYS.some((d) => !!hours[d]?.trim());

/** Open right now? If not, when does it next open — within the coming week. */
export function getOpenStatus(hours: BusinessHours | undefined, now: Date): OpenStatus {
  if (!hasAnyHours(hours)) return { kind: 'unknown' };
  const todayIndex = WEEK_DAYS.indexOf(weekDayOf(now));
  const minute = now.getHours() * 60 + now.getMinutes();
  const dayAt = (offset: number) => WEEK_DAYS[(todayIndex + offset + 7) % 7];

  // A range from yesterday that runs past midnight may still be open.
  const yesterday = parseDayHours(hours![dayAt(-1)]);
  if (yesterday.kind === 'ranges') {
    const carry = yesterday.ranges.find((r) => r.close > 1440 && minute < r.close - 1440);
    if (carry) return { kind: 'open', closesAt: formatMinutes(carry.close) };
  }

  const today = parseDayHours(hours![dayAt(0)]);
  if (today.kind === 'unreadable') return { kind: 'unreadable', text: today.text };
  if (today.kind === 'ranges') {
    const current = today.ranges.find((r) => minute >= r.open && minute < r.close);
    if (current) return { kind: 'open', closesAt: current.open === 0 && current.close === 1440 ? null : formatMinutes(current.close) };
    const later = today.ranges.filter((r) => r.open > minute).sort((a, b) => a.open - b.open)[0];
    if (later) return { kind: 'closed', opensAt: formatMinutes(later.open), opensDay: 'today' };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const day = parseDayHours(hours![dayAt(offset)]);
    if (day.kind === 'ranges') {
      const first = [...day.ranges].sort((a, b) => a.open - b.open)[0];
      return { kind: 'closed', opensAt: formatMinutes(first.open), opensDay: offset === 1 ? 'tomorrow' : dayAt(offset) };
    }
  }
  return { kind: 'closedToday' };
}
