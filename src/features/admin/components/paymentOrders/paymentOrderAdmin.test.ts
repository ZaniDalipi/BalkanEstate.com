import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { toPaymentInput, validatePaymentFields, parseAmount } from './paymentFieldsValidation';
import { describeOrderError, methodLabel, todayInputValue } from './paymentOrderAdminText';

const t = ((key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key) as unknown as TFunction;
const base = { amount: '25', method: 'bank_transfer' as const, paidAt: '2026-11-20', note: '' };

describe('validatePaymentFields', () => {
  it('accepts a normal payment', () => {
    expect(validatePaymentFields(base, '2026-11-20')).toEqual({});
  });

  it('names the field that is wrong', () => {
    expect(Object.keys(validatePaymentFields({ ...base, amount: 'abc' }, '2026-11-20'))).toEqual(['amount']);
    expect(Object.keys(validatePaymentFields({ ...base, amount: '-1' }, '2026-11-20'))).toEqual(['amount']);
    expect(Object.keys(validatePaymentFields({ ...base, paidAt: '2026-11-21' }, '2026-11-20'))).toEqual(['paidAt']);
  });

  it('reads a comma as the decimal sign', () => {
    expect(parseAmount('24,99')).toBe(24.99);
    expect(toPaymentInput({ ...base, amount: '24,99', note: '  receipt 12 ' }, true)).toEqual({
      amount: 24.99, method: 'bank_transfer', paidAt: '2026-11-20', note: 'receipt 12', acceptDifferentAmount: true,
    });
  });
});

describe('describeOrderError', () => {
  it('reads the code, the field and the amounts of a mismatch', () => {
    const err = Object.assign(new Error('x'), {
      code: 'AMOUNT_MISMATCH',
      details: { field: 'amount', amountDueCents: 2500, paidAmountCents: 2000 },
    });
    expect(describeOrderError(err, t)).toEqual({
      text: 'The amount received differs from the amount due.',
      code: 'AMOUNT_MISMATCH',
      field: 'amount',
      amountDueCents: 2500,
      paidAmountCents: 2000,
    });
  });

  it('never shows an unknown server message', () => {
    expect(describeOrderError(new Error('E11000 duplicate key'), t).text).toBe('That did not work. Please try again.');
  });

  it('labels payment methods, and dates for a date input', () => {
    expect(methodLabel('card_terminal', t)).toBe('Card terminal');
    expect(todayInputValue(new Date('2026-11-20T12:00:00'))).toBe('2026-11-20');
  });
});

describe('admin:paymentOrders translations', () => {
  const read = (lang: string) => JSON.parse(readFileSync(resolve(__dirname, `../../../../i18n/locales/${lang}/admin.json`), 'utf-8'));
  const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> =>
    Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
      if (v && typeof v === 'object') Object.assign(acc, flatten(v as Record<string, unknown>, `${prefix}${k}.`));
      else acc[`${prefix}${k}`] = String(v);
      return acc;
    }, {});
  const english = flatten(read('en').paymentOrders);
  const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();

  it.each(['sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro'])('%s has every text and the sidebar label', (lang) => {
    const file = read(lang);
    const texts = flatten(file.paymentOrders);
    for (const [key, value] of Object.entries(english)) {
      expect(texts[key], `${lang}: ${key}`).toEqual(expect.any(String));
      expect(placeholders(texts[key]), `${lang}: ${key}`).toEqual(placeholders(value));
    }
    expect(file.sidebar.paymentOrders).toEqual(expect.any(String));
  });
});
