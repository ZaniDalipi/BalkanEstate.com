import type { OpenHouseDraft } from '../types';

/**
 * The seller's form fields → a draft the API accepts. Mirrors the server's
 * rules (backend/src/services/openHouse/openHouseRules.ts) so mistakes show
 * next to the field before anything is sent; the server checks again.
 */

export interface OpenHouseFormValues {
  date: string;  // YYYY-MM-DD, local
  start: string; // HH:MM, local
  end: string;   // HH:MM, local
  note: string;
  capacity: string;
}

export const EMPTY_OPEN_HOUSE_FORM: OpenHouseFormValues = { date: '', start: '11:00', end: '13:00', note: '', capacity: '' };

export type OpenHouseField = 'date' | 'start' | 'end' | 'capacity';

export interface DraftError {
  field: OpenHouseField;
  key: string;
  defaultValue: string;
}

export type DraftResult = { ok: true; value: OpenHouseDraft } | { ok: false; error: DraftError };

const MIN_MS = 30 * 60 * 1000;
const MAX_MS = 6 * 60 * 60 * 1000;
const MAX_LEAD_MS = 180 * 24 * 60 * 60 * 1000;
export const MAX_OPEN_HOUSES_PER_LISTING = 5;

const err = (field: OpenHouseField, key: string, defaultValue: string): DraftResult =>
  ({ ok: false, error: { field, key: `property:openHouse.errors.${key}`, defaultValue } });

/** Local wall-clock date + time → Date, or null when either is malformed. */
export function localDateTime(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!d || !t) return null;
  const out = new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  return Number.isNaN(out.getTime()) ? null : out;
}

export function draftFromForm(v: OpenHouseFormValues, now: Date): DraftResult {
  if (!v.date) return err('date', 'dateRequired', 'Choose a date');
  const start = localDateTime(v.date, v.start);
  if (!start) return err('start', 'startRequired', 'Choose a start time');
  const end = localDateTime(v.date, v.end);
  if (!end) return err('end', 'endRequired', 'Choose an end time');
  if (start <= now) return err('start', 'inPast', 'The open house must start in the future');
  const length = end.getTime() - start.getTime();
  if (length <= 0) return err('end', 'endBeforeStart', 'The end time must be after the start time');
  if (length < MIN_MS) return err('end', 'tooShort', 'An open house lasts at least 30 minutes');
  if (length > MAX_MS) return err('end', 'tooLong', 'An open house lasts at most 6 hours');
  if (start.getTime() - now.getTime() > MAX_LEAD_MS) return err('date', 'tooFar', 'An open house can be planned up to 6 months ahead');

  let capacity: number | undefined;
  if (v.capacity.trim() !== '') {
    const n = Number(v.capacity);
    if (!Number.isInteger(n) || n < 1 || n > 500) return err('capacity', 'capacity', 'Enter a number from 1 to 500, or leave it empty');
    capacity = n;
  }
  const note = v.note.trim().slice(0, 500) || undefined;
  return { ok: true, value: { startsAt: start.toISOString(), endsAt: end.toISOString(), note, capacity } };
}

/** Does the new window overlap any already chosen? */
export function overlapsAny(draft: { startsAt: string; endsAt: string }, others: { startsAt: string; endsAt: string }[]): boolean {
  const s = Date.parse(draft.startsAt);
  const e = Date.parse(draft.endsAt);
  return others.some((o) => s < Date.parse(o.endsAt) && Date.parse(o.startsAt) < e);
}

/** Today's date as YYYY-MM-DD in local time — the date input's minimum. */
export function todayInputValue(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
