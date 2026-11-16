import { describe, it, expect } from 'vitest';
import { validateNotPastDate } from './validation';

const TODAY = new Date(2026, 10, 16, 15, 30);

describe('validateNotPastDate', () => {
  it('accepts an empty value, today and later days', () => {
    expect(validateNotPastDate('', TODAY).isValid).toBe(true);
    expect(validateNotPastDate('2026-11-16', TODAY).isValid).toBe(true);
    expect(validateNotPastDate('2027-03-01', TODAY).isValid).toBe(true);
  });

  it('rejects yesterday and dates that do not exist', () => {
    expect(validateNotPastDate('2026-11-15', TODAY)).toEqual({ isValid: false, error: 'Date cannot be in the past' });
    expect(validateNotPastDate('2027-02-31', TODAY).isValid).toBe(false);
    expect(validateNotPastDate('next spring', TODAY).isValid).toBe(false);
  });
});
