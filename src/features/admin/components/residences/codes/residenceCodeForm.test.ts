import { describe, expect, it } from 'vitest';
import { CODE_FORM_DEFAULTS, codeFormPayload, validateCodeForm } from './residenceCodeForm';

describe('residence code form', () => {
  it('accepts the defaults (the whole price) and sends numbers, without an empty note', () => {
    expect(validateCodeForm(CODE_FORM_DEFAULTS)).toEqual({});
    expect(codeFormPayload({ ...CODE_FORM_DEFAULTS, count: ' 5 ', note: '  ' })).toEqual({ kind: 'pass', discountType: 'percentage', discountValue: 100, count: 5, usageLimit: 1, days: 90 });
    expect(codeFormPayload({ ...CODE_FORM_DEFAULTS, kind: 'extra_building', note: ' Vardar ' })).toMatchObject({ kind: 'extra_building', note: 'Vardar' });
  });

  it('sends a percentage or an amount off', () => {
    expect(codeFormPayload({ ...CODE_FORM_DEFAULTS, discount: 'percentage', discountValue: '20' })).toMatchObject({ discountType: 'percentage', discountValue: 20 });
    expect(codeFormPayload({ ...CODE_FORM_DEFAULTS, discount: 'fixed', discountValue: ' 50 ' })).toMatchObject({ discountType: 'fixed', discountValue: 50 });
  });

  it('names every field out of range at once', () => {
    expect(validateCodeForm({ kind: 'pass', discount: 'percentage', discountValue: '100', count: '0', usageLimit: '1.5', days: '800', note: 'x'.repeat(201) })).toEqual({
      discountValue: { key: 'range', min: 1, max: 99 },
      count: { key: 'range', min: 1, max: 50 },
      usageLimit: { key: 'range', min: 1, max: 100 },
      days: { key: 'range', min: 1, max: 730 },
      note: { key: 'tooLong', max: 200 },
    });
    expect(validateCodeForm({ ...CODE_FORM_DEFAULTS, discount: 'fixed', discountValue: '' }).discountValue).toEqual({ key: 'range', min: 1, max: 10000 });
    expect(validateCodeForm({ ...CODE_FORM_DEFAULTS, count: 'ten' }).count).toEqual({ key: 'range', min: 1, max: 50 });
  });
});
