import { describe, expect, it } from 'vitest';
import { autoFormatDate, formatDMY, fromISODate, toISODate } from './dmyDate';

describe('dd/mm/yyyy dates', () => {
  it('formats a moment, in a time zone when given', () => {
    expect(formatDMY(new Date(2026, 10, 5, 12))).toBe('05/11/2026');
    expect(formatDMY('2026-11-21T23:30:00Z', 'Europe/Belgrade')).toBe('22/11/2026');
    expect(formatDMY('not a date')).toBe('');
  });
  it('converts to and from ISO, rejecting impossible dates', () => {
    expect(fromISODate('2026-11-21')).toBe('21/11/2026');
    expect(toISODate('21/11/2026')).toBe('2026-11-21');
    expect(toISODate('1/2/2027')).toBe('2027-02-01');
    expect(toISODate('31/02/2027')).toBe('');
    expect(toISODate('2026-11-21')).toBe('');
    expect(fromISODate('nope')).toBe('');
  });
  it('adds the slashes while typing', () => {
    expect(autoFormatDate('2')).toBe('2');
    expect(autoFormatDate('211')).toBe('21/1');
    expect(autoFormatDate('21112026')).toBe('21/11/2026');
    expect(autoFormatDate('21a11-2026999')).toBe('21/11/2026');
  });
});
