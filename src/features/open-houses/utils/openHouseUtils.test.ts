import { describe, expect, it } from 'vitest';
import { draftFromForm, localDateTime, overlapsAny, todayInputValue, type OpenHouseFormValues } from './openHouseDraft';
import { formatOpenHouseWindow, openHouseWhen } from './openHouseFormat';
import { buildOpenHouseIcs } from './openHouseIcs';
import { validateRsvp } from './validateRsvp';
import { openHouseErrorKey } from './openHouseErrorKey';

// Local wall clock: 15 Nov 2026, 10:00
const now = new Date(2026, 10, 15, 10, 0);
const form = (over: Partial<OpenHouseFormValues> = {}): OpenHouseFormValues =>
  ({ date: '2026-11-21', start: '11:00', end: '13:00', note: '', capacity: '', ...over });

describe('draftFromForm', () => {
  it('turns the local date and times into an ISO window', () => {
    const r = draftFromForm(form({ note: '  Bell B  ', capacity: '8' }), now);
    expect(r.ok).toBe(true);
    if (r.ok === false) return;
    expect(new Date(r.value.startsAt).getTime()).toBe(new Date(2026, 10, 21, 11, 0).getTime());
    expect(new Date(r.value.endsAt).getTime()).toBe(new Date(2026, 10, 21, 13, 0).getTime());
    expect(r.value.note).toBe('Bell B');
    expect(r.value.capacity).toBe(8);
  });

  it.each([
    [{ date: '' }, 'date', 'dateRequired'],
    [{ start: '' }, 'start', 'startRequired'],
    [{ date: '2026-11-14' }, 'start', 'inPast'],
    [{ end: '10:00' }, 'end', 'endBeforeStart'],
    [{ end: '11:15' }, 'end', 'tooShort'],
    [{ end: '18:00' }, 'end', 'tooLong'],
    [{ date: '2027-07-01' }, 'date', 'tooFar'],
    [{ capacity: '0' }, 'capacity', 'capacity'],
    [{ capacity: 'lots' }, 'capacity', 'capacity'],
  ])('points %j at the %s field', (over, field, key) => {
    const r = draftFromForm(form(over), now);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.error.field).toBe(field);
      expect(r.error.key).toBe(`property:openHouse.errors.${key}`);
    }
  });

  it('rejects malformed times', () => {
    expect(localDateTime('2026-11-21', '25:00')).toBeNull();
    expect(localDateTime('21.11.2026', '11:00')).toBeNull();
  });
});

describe('overlapsAny', () => {
  const w = (s: number, e: number) => ({ startsAt: new Date(2026, 10, 21, s).toISOString(), endsAt: new Date(2026, 10, 21, e).toISOString() });
  it('allows back to back, refuses overlap', () => {
    expect(overlapsAny(w(13, 14), [w(11, 13)])).toBe(false);
    expect(overlapsAny(w(12, 14), [w(11, 13)])).toBe(true);
  });
});

describe('todayInputValue', () => {
  it('is the local date', () => expect(todayInputValue(now)).toBe('2026-11-15'));
});

describe('formatOpenHouseWindow / openHouseWhen', () => {
  it('formats day and time span in the given zone', () => {
    const r = formatOpenHouseWindow('2026-11-21T10:00:00Z', '2026-11-21T12:00:00Z', 'en', 'Europe/Belgrade');
    expect(r.time).toBe('11:00–13:00');
    expect(r.day).toContain('21');
    expect(r.day).toMatch(/Sat/);
  });

  it('says now, today or tomorrow when it fits', () => {
    const at = (d: number, h: number) => new Date(2026, 10, d, h).toISOString();
    expect(openHouseWhen(at(15, 9), at(15, 11), now)).toBe('now');
    expect(openHouseWhen(at(15, 14), at(15, 16), now)).toBe('today');
    expect(openHouseWhen(at(16, 11), at(16, 13), now)).toBe('tomorrow');
    expect(openHouseWhen(at(20, 11), at(20, 13), now)).toBeNull();
    expect(openHouseWhen(at(15, 7), at(15, 9), now)).toBeNull();
  });
});

describe('buildOpenHouseIcs', () => {
  it('builds one escaped event in UTC', () => {
    const ics = buildOpenHouseIcs({
      id: 'abc', title: 'Open house: Flat, sea view', location: 'Budva; Montenegro', url: 'https://x.test/p/1',
      startsAt: '2026-11-21T10:00:00.000Z', endsAt: '2026-11-21T12:00:00.000Z', description: 'Bell B',
    }, new Date('2026-11-15T09:00:00Z'));
    expect(ics).toContain('DTSTART:20261121T100000Z');
    expect(ics).toContain('DTEND:20261121T120000Z');
    expect(ics).toContain('SUMMARY:Open house: Flat\\, sea view');
    expect(ics).toContain('LOCATION:Budva\; Montenegro');
    expect(ics).toContain('UID:open-house-abc@balkanestateai.com');
    expect(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(1);
  });
});

describe('validateRsvp', () => {
  it('needs a name and an email; the phone is optional', () => {
    expect(validateRsvp({ name: ' Ana ', email: 'ana@example.com', phone: '' })).toEqual({
      ok: true, value: { name: 'Ana', email: 'ana@example.com', phone: undefined },
    });
    const bad = validateRsvp({ name: '', email: 'nope', phone: '12' });
    expect(bad.ok).toBe(false);
    if (bad.ok === false) expect(Object.keys(bad.errors).sort()).toEqual(['email', 'name', 'phone']);
  });
});

describe('openHouseErrorKey', () => {
  it('maps what a visitor can act on', () => {
    expect(openHouseErrorKey({ statusCode: 409 }).key).toBe('property:openHouse.errors.unavailable');
    expect(openHouseErrorKey({ statusCode: 429 }).key).toBe('property:openHouse.errors.tooMany');
    expect(openHouseErrorKey(new Error('x')).key).toBe('property:openHouse.errors.generic');
  });
});
