import { describe, expect, it } from 'vitest';
import { getOpenStatus, parseDayHours, weekDayOf, type BusinessHours } from './businessHours';

// 2026-11-03 is a Tuesday.
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m);
const weekdays: BusinessHours = {
  monday: '09:00 - 17:00', tuesday: '09:00 - 17:00', wednesday: '09:00 - 17:00',
  thursday: '09:00 - 17:00', friday: '09:00 - 17:00', saturday: 'Closed', sunday: '',
};

describe('parseDayHours', () => {
  it('reads the common ways owners write hours', () => {
    expect(parseDayHours('09:00 - 17:00')).toEqual({ kind: 'ranges', ranges: [{ open: 540, close: 1020 }] });
    expect(parseDayHours('9-17')).toEqual({ kind: 'ranges', ranges: [{ open: 540, close: 1020 }] });
    expect(parseDayHours('8.30–12.00, 14:00-18:00')).toEqual({ kind: 'ranges', ranges: [{ open: 510, close: 720 }, { open: 840, close: 1080 }] });
    expect(parseDayHours('24h')).toEqual({ kind: 'ranges', ranges: [{ open: 0, close: 1440 }] });
    expect(parseDayHours('18:00 - 02:00')).toEqual({ kind: 'ranges', ranges: [{ open: 1080, close: 1560 }] });
  });

  it('treats blank and "closed" (in local languages too) as closed, and admits what it cannot read', () => {
    expect(parseDayHours('')).toEqual({ kind: 'closed' });
    expect(parseDayHours('Mbyllur')).toEqual({ kind: 'closed' });
    expect(parseDayHours('Zatvoreno')).toEqual({ kind: 'closed' });
    expect(parseDayHours('By appointment')).toEqual({ kind: 'unreadable', text: 'By appointment' });
    expect(parseDayHours('25:00 - 26:00').kind).toBe('unreadable');
  });
});

describe('getOpenStatus', () => {
  it('knows the week day', () => {
    expect(weekDayOf(at(3, 12))).toBe('tuesday');
  });

  it('is open inside today’s hours and says when it closes', () => {
    expect(getOpenStatus(weekdays, at(3, 10))).toEqual({ kind: 'open', closesAt: '17:00' });
  });

  it('is closed before opening, and opens later today', () => {
    expect(getOpenStatus(weekdays, at(3, 7, 30))).toEqual({ kind: 'closed', opensAt: '09:00', opensDay: 'today' });
  });

  it('after closing it opens tomorrow; on Friday night it skips to Monday', () => {
    expect(getOpenStatus(weekdays, at(3, 20))).toEqual({ kind: 'closed', opensAt: '09:00', opensDay: 'tomorrow' });
    expect(getOpenStatus(weekdays, at(6, 20))).toEqual({ kind: 'closed', opensAt: '09:00', opensDay: 'monday' });
  });

  it('carries a past-midnight range into the next morning', () => {
    const bar: BusinessHours = { monday: '18:00 - 02:00' };
    expect(getOpenStatus(bar, at(3, 1))).toEqual({ kind: 'open', closesAt: '02:00' });
  });

  it('open around the clock has no closing time', () => {
    expect(getOpenStatus({ tuesday: '24/7' }, at(3, 3))).toEqual({ kind: 'open', closesAt: null });
  });

  it('shows unreadable text as written, and is unknown without any hours', () => {
    expect(getOpenStatus({ tuesday: 'By appointment' }, at(3, 10))).toEqual({ kind: 'unreadable', text: 'By appointment' });
    expect(getOpenStatus(undefined, at(3, 10))).toEqual({ kind: 'unknown' });
    expect(getOpenStatus({ monday: ' ' }, at(3, 10))).toEqual({ kind: 'unknown' });
  });
});
