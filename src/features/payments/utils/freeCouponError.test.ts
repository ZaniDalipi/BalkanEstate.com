import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { freeCouponErrorText, freeCouponRefusal } from './freeCouponError';

describe('freeCouponRefusal', () => {
  it('reads a known refusal code with the server text and the amount left', () => {
    expect(freeCouponRefusal({ code: 'CODE_NOT_FREE', message: 'Not free', remaining: 20 })).toEqual({
      code: 'CODE_NOT_FREE',
      message: 'Not free',
      remaining: 20,
    });
  });

  it('ignores bodies without a known code', () => {
    expect(freeCouponRefusal({ message: 'Error applying free subscription' })).toBeNull();
    expect(freeCouponRefusal({ code: 'SOMETHING_ELSE' })).toBeNull();
    expect(freeCouponRefusal(null)).toBeNull();
  });

  it('drops a remaining amount that is not a number', () => {
    expect(freeCouponRefusal({ code: 'CODE_NOT_FREE', remaining: '20' })?.remaining).toBeUndefined();
  });
});

describe('freeCouponErrorText', () => {
  it('points at the locale key and keeps the server text as the default', () => {
    expect(freeCouponErrorText({ code: 'PLAN_NOT_FOUND', message: 'This plan is not available.' })).toEqual({
      key: 'payment:errors.freeCoupon.PLAN_NOT_FOUND',
      options: { defaultValue: 'This plan is not available.' },
    });
  });

  it('formats the amount left to two decimals', () => {
    expect(freeCouponErrorText({ code: 'CODE_NOT_FREE', message: '', remaining: 20 }).options.remaining).toBe('20.00');
  });
});

describe('payment:errors.freeCoupon translations', () => {
  const codes = [
    'PLAN_REQUIRED',
    'CODE_REQUIRED',
    'PLAN_NOT_FOUND',
    'PLAN_NOT_ELIGIBLE',
    'ALREADY_SUBSCRIBED',
    'CODE_INVALID',
    'CODE_NOT_FREE',
    'CODE_USED_UP',
  ];

  it.each(['en', 'sq', 'bs', 'hr', 'me', 'sr', 'mk', 'bg', 'el', 'ro'])('%s has every refusal text', (lang) => {
    const file = resolve(__dirname, `../../../i18n/locales/${lang}/payment.json`);
    const texts = JSON.parse(readFileSync(file, 'utf-8')).errors.freeCoupon as Record<string, string>;
    for (const code of codes) {
      expect(texts[code], `${lang}: ${code}`).toEqual(expect.any(String));
      expect(texts[code].length, `${lang}: ${code}`).toBeGreaterThan(0);
    }
    expect(texts.CODE_NOT_FREE).toContain('{{remaining}}');
  });
});
