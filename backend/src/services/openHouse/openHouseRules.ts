/**
 * Pure rules for open houses — no database, so they are unit-tested directly
 * and shared by the create-listing flow and the open-house endpoints.
 */

export const MIN_DURATION_MS = 30 * 60 * 1000;
export const MAX_DURATION_MS = 6 * 60 * 60 * 1000;
/** How far ahead an open house may be planned. */
export const MAX_LEAD_MS = 180 * 24 * 60 * 60 * 1000;
export const MAX_UPCOMING_PER_LISTING = 5;
export const MAX_NOTE_LENGTH = 500;
export const MAX_CAPACITY = 500;

export interface OpenHouseWindow {
  startsAt: Date;
  endsAt: Date;
}

export interface OpenHouseDraft extends OpenHouseWindow {
  note?: string;
  capacity?: number;
}

export type RuleResult<T> = { ok: true; value: T } | { ok: false; error: string };

const toDate = (raw: unknown): Date | null => {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const overlaps = (a: OpenHouseWindow, b: OpenHouseWindow): boolean =>
  a.startsAt < b.endsAt && b.startsAt < a.endsAt;

/** Turn untrusted request input into a draft, or say exactly what is wrong. */
export function parseOpenHouseDraft(raw: unknown, now: Date): RuleResult<OpenHouseDraft> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Open house details are missing' };
  const input = raw as Record<string, unknown>;
  const startsAt = toDate(input.startsAt);
  const endsAt = toDate(input.endsAt);
  if (!startsAt || !endsAt) return { ok: false, error: 'Choose a date, a start time and an end time' };

  const windowCheck = checkWindow({ startsAt, endsAt }, now);
  if (windowCheck.ok === false) return windowCheck;

  let note: string | undefined;
  if (input.note != null && input.note !== '') {
    if (typeof input.note !== 'string') return { ok: false, error: 'The note must be text' };
    note = input.note.trim().slice(0, MAX_NOTE_LENGTH) || undefined;
  }

  let capacity: number | undefined;
  if (input.capacity != null && input.capacity !== '') {
    const n = Number(input.capacity);
    if (!Number.isInteger(n) || n < 1 || n > MAX_CAPACITY) {
      return { ok: false, error: `The number of visitors must be between 1 and ${MAX_CAPACITY}` };
    }
    capacity = n;
  }

  return { ok: true, value: { startsAt, endsAt, note, capacity } };
}

/** A single window on its own: in the future, sensible length, not too far ahead. */
export function checkWindow(w: OpenHouseWindow, now: Date): RuleResult<OpenHouseWindow> {
  if (w.startsAt.getTime() <= now.getTime()) return { ok: false, error: 'The open house must start in the future' };
  const length = w.endsAt.getTime() - w.startsAt.getTime();
  if (length <= 0) return { ok: false, error: 'The end time must be after the start time' };
  if (length < MIN_DURATION_MS) return { ok: false, error: 'An open house lasts at least 30 minutes' };
  if (length > MAX_DURATION_MS) return { ok: false, error: 'An open house lasts at most 6 hours' };
  if (w.startsAt.getTime() - now.getTime() > MAX_LEAD_MS) {
    return { ok: false, error: 'An open house can be planned up to 6 months ahead' };
  }
  return { ok: true, value: w };
}

/** New windows against each other and against the listing's upcoming ones. */
export function checkAgainstSchedule(
  drafts: OpenHouseWindow[],
  upcoming: OpenHouseWindow[],
): RuleResult<true> {
  if (upcoming.length + drafts.length > MAX_UPCOMING_PER_LISTING) {
    return { ok: false, error: `A listing can have at most ${MAX_UPCOMING_PER_LISTING} upcoming open houses` };
  }
  const all = [...upcoming];
  for (const d of drafts) {
    if (all.some((o) => overlaps(o, d))) return { ok: false, error: 'This time overlaps another open house' };
    all.push(d);
  }
  return { ok: true, value: true };
}

export type RsvpBlock = 'cancelled' | 'over' | 'full';

/** Can someone still sign up? Returns why not, or null when they can. */
export function rsvpBlock(
  oh: { status: string; endsAt: Date; capacity?: number; rsvpCount: number },
  now: Date,
): RsvpBlock | null {
  if (oh.status !== 'scheduled') return 'cancelled';
  if (oh.endsAt.getTime() <= now.getTime()) return 'over';
  if (oh.capacity != null && oh.rsvpCount >= oh.capacity) return 'full';
  return null;
}

/** Which reminder (if any) is due for an RSVP now. */
export function dueReminder(
  startsAt: Date,
  rsvp: { remindedDayBefore?: boolean; remindedSoon?: boolean },
  now: Date,
): 'soon' | 'dayBefore' | null {
  const until = startsAt.getTime() - now.getTime();
  if (until <= 0) return null;
  if (until <= 2 * 60 * 60 * 1000) return rsvp.remindedSoon ? null : 'soon';
  if (until <= 24 * 60 * 60 * 1000) return rsvp.remindedDayBefore ? null : 'dayBefore';
  return null;
}
