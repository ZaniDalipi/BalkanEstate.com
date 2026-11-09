import { describe, expect, it } from 'vitest';
import { CODE_FORM_DEFAULTS, codeFormPayload, validateCodeForm } from './residenceCodeForm';

describe('residence code form', () => {
  it('accepts the defaults and sends numbers, without an empty note', () => {
    expect(validateCodeForm(CODE_FORM_DEFAULTS)).toEqual({});
    expect(codeFormPayload({ ...CODE_FORM_DEFAULTS, count: ' 5 ', note: '  ' })).toEqual({ kind: 'pass', count: 5, usageLimit: 1, days: 90 });
    expect(codeFormPayload({ ...CODE_FORM_DEFAULTS, kind: 'extra_building', note: ' Vardar ' })).toMatchObject({ kind: 'extra_building', note: 'Vardar' });
  });

  it('names every field out of range at once', () => {
    expect(validateCodeForm({ kind: 'pass', count: '0', usageLimit: '1.5', days: '800', note: 'x'.repeat(201) })).toEqual({
      count: { key: 'range', min: 1, max: 50 },
      usageLimit: { key: 'range', min: 1, max: 100 },
      days: { key: 'range', min: 1, max: 730 },
      note: { key: 'tooLong', max: 200 },
    });
    expect(validateCodeForm({ ...CODE_FORM_DEFAULTS, count: 'ten' }).count).toEqual({ key: 'range', min: 1, max: 50 });
  });
});
