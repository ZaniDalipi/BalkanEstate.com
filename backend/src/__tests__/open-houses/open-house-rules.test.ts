process.env.SKIP_TEST_DB = 'true';

import {
  checkAgainstSchedule,
  dueReminder,
  parseOpenHouseDraft,
  rsvpBlock,
} from '../../services/openHouse/openHouseRules';
import { formatOpenHouseWindow, listingTimeZone } from '../../services/openHouse/openHouseTime';

const now = new Date('2026-11-15T10:00:00Z');
const at = (iso: string) => new Date(iso);
const h = (n: number) => n * 60 * 60 * 1000;

describe('parseOpenHouseDraft', () => {
  const valid = { startsAt: '2026-11-21T10:00:00Z', endsAt: '2026-11-21T12:00:00Z' };

  it('accepts a two-hour window next week with an optional note and cap', () => {
    const r = parseOpenHouseDraft({ ...valid, note: '  Ring bell 3  ', capacity: '12' }, now);
    expect(r.ok).toBe(true);
    if (r.ok === false) return;
    expect(r.value.note).toBe('Ring bell 3');
    expect(r.value.capacity).toBe(12);
  });

  it.each([
    [{}, 'Choose a date'],
    [{ startsAt: '2026-11-14T10:00:00Z', endsAt: '2026-11-14T12:00:00Z' }, 'future'],
    [{ startsAt: valid.endsAt, endsAt: valid.startsAt }, 'after the start'],
    [{ startsAt: valid.startsAt, endsAt: '2026-11-21T10:15:00Z' }, 'at least 30 minutes'],
    [{ startsAt: valid.startsAt, endsAt: '2026-11-21T17:00:00Z' }, 'at most 6 hours'],
    [{ startsAt: '2027-08-01T10:00:00Z', endsAt: '2027-08-01T12:00:00Z' }, '6 months'],
    [{ ...valid, capacity: 0 }, 'between 1 and'],
    [{ ...valid, capacity: 2.5 }, 'between 1 and'],
  ])('rejects %j', (input, message) => {
    const r = parseOpenHouseDraft(input, now);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toContain(message);
  });

  it('rejects input that is not an object', () => {
    expect(parseOpenHouseDraft(null, now).ok).toBe(false);
    expect(parseOpenHouseDraft('tomorrow', now).ok).toBe(false);
  });
});

describe('checkAgainstSchedule', () => {
  const w = (start: string, end: string) => ({ startsAt: at(start), endsAt: at(end) });

  it('allows back-to-back windows', () => {
    expect(checkAgainstSchedule(
      [w('2026-11-21T12:00:00Z', '2026-11-21T13:00:00Z')],
      [w('2026-11-21T10:00:00Z', '2026-11-21T12:00:00Z')],
    ).ok).toBe(true);
  });

  it('rejects overlap with an existing or a sibling window', () => {
    expect(checkAgainstSchedule(
      [w('2026-11-21T11:00:00Z', '2026-11-21T13:00:00Z')],
      [w('2026-11-21T10:00:00Z', '2026-11-21T12:00:00Z')],
    ).ok).toBe(false);
    expect(checkAgainstSchedule(
      [w('2026-11-21T10:00:00Z', '2026-11-21T12:00:00Z'), w('2026-11-21T11:30:00Z', '2026-11-21T12:30:00Z')],
      [],
    ).ok).toBe(false);
  });

  it('caps a listing at five upcoming open houses', () => {
    const existing = [1, 2, 3, 4, 5].map((d) => w(`2026-12-0${d}T10:00:00Z`, `2026-12-0${d}T11:00:00Z`));
    const r = checkAgainstSchedule([w('2026-12-08T10:00:00Z', '2026-12-08T11:00:00Z')], existing);
    expect(r.ok).toBe(false);
  });
});

describe('rsvpBlock', () => {
  const base = { status: 'scheduled', endsAt: new Date(now.getTime() + h(3)), rsvpCount: 0 };
  it('lets people sign up while there is room', () => {
    expect(rsvpBlock(base, now)).toBeNull();
    expect(rsvpBlock({ ...base, capacity: 2, rsvpCount: 1 }, now)).toBeNull();
  });
  it('explains why not', () => {
    expect(rsvpBlock({ ...base, status: 'cancelled' }, now)).toBe('cancelled');
    expect(rsvpBlock({ ...base, endsAt: now }, now)).toBe('over');
    expect(rsvpBlock({ ...base, capacity: 2, rsvpCount: 2 }, now)).toBe('full');
  });
});

describe('dueReminder', () => {
  const start = (inHours: number) => new Date(now.getTime() + h(inHours));
  it('is quiet more than a day ahead and after the start', () => {
    expect(dueReminder(start(30), {}, now)).toBeNull();
    expect(dueReminder(start(-1), {}, now)).toBeNull();
  });
  it('sends the day-before reminder once', () => {
    expect(dueReminder(start(20), {}, now)).toBe('dayBefore');
    expect(dueReminder(start(20), { remindedDayBefore: true }, now)).toBeNull();
  });
  it('sends the soon reminder once, even if the day-before one went out', () => {
    expect(dueReminder(start(1.5), { remindedDayBefore: true }, now)).toBe('soon');
    expect(dueReminder(start(1.5), { remindedSoon: true }, now)).toBeNull();
  });
});

describe('open house time formatting', () => {
  it('uses the listing country time zone', () => {
    expect(listingTimeZone('Greece')).toBe('Europe/Bucharest');
    expect(listingTimeZone('Montenegro')).toBe('Europe/Belgrade');
    expect(formatOpenHouseWindow(at('2026-11-21T10:00:00Z'), at('2026-11-21T12:00:00Z'), 'Serbia'))
      .toBe('Saturday 21 November, 11:00–13:00');
    expect(formatOpenHouseWindow(at('2026-11-21T10:00:00Z'), at('2026-11-21T12:00:00Z'), 'Greece'))
      .toBe('Saturday 21 November, 12:00–14:00');
  });
});
