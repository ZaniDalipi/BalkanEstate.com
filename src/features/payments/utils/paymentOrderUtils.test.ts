import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { formatOrderAmount, formatOrderDate } from './orderFormat';
import { planRequestErrorText } from './planRequestError';

describe('formatOrderAmount', () => {
  it('formats whole cents as money in the reader\'s locale', () => {
    expect(formatOrderAmount(2500, 'EUR', 'en')).toBe('€25.00');
    // German puts a no-break space before the sign.
    expect(formatOrderAmount(2499, 'EUR', 'de').replace(/\s/g, ' ')).toBe('24,99 €');
  });

  it('falls back to the plain number for an unknown currency', () => {
    expect(formatOrderAmount(1000, 'NOT-A-CURRENCY', 'en')).toBe('10.00 NOT-A-CURRENCY');
  });
});

describe('formatOrderDate', () => {
  it('formats a date and ignores missing or broken ones', () => {
    expect(formatOrderDate('2026-11-20T10:00:00.000Z', 'en')).toBe('Nov 20, 2026');
    expect(formatOrderDate(undefined)).toBe('');
    expect(formatOrderDate('nope')).toBe('');
  });
});

describe('planRequestErrorText', () => {
  it('points a known refusal at its locale key, with the server text as the default', () => {
    expect(planRequestErrorText({ code: 'CODE_USED_UP', message: 'This code has already been used.' })).toEqual({
      key: 'payment:planRequest.errors.CODE_USED_UP',
      defaultValue: 'This code has already been used.',
    });
  });

  it('uses the generic message for anything else (network, rate limit, server error)', () => {
    expect(planRequestErrorText({ code: null, message: 'Too many payment attempts' }).key).toBe('payment:planRequest.errors.generic');
    expect(planRequestErrorText(new Error('Failed to fetch')).key).toBe('payment:planRequest.errors.generic');
  });
});

describe('payment:planRequest translations', () => {
  const read = (lang: string) =>
    JSON.parse(readFileSync(resolve(__dirname, `../../../i18n/locales/${lang}/payment.json`), 'utf-8'));
  const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
    Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v && typeof v === 'object') Object.assign(acc, flatten(v as Record<string, unknown>, `${prefix}${k}.`));
      else acc[`${prefix}${k}`] = String(v);
      return acc;
    }, {});
  const english = flatten(read('en').planRequest);
  const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();

  it.each(['sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro'])('%s has every text, with the same placeholders', (lang) => {
    const texts = flatten(read(lang).planRequest);
    for (const [key, value] of Object.entries(english)) {
      expect(texts[key], `${lang}: ${key}`).toEqual(expect.any(String));
      expect(placeholders(texts[key]), `${lang}: ${key}`).toEqual(placeholders(value));
    }
  });

  it.each(['sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro'])('%s no longer shows the English placeholder texts in the payment box', (lang) => {
    const soon = read(lang).comingSoon;
    expect(soon.selfServicePayment).not.toBe('Self-service payment');
    expect(soon.integrationInProgress).not.toBe('Payment integration in progress');
  });
});
