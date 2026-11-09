process.env.SKIP_TEST_DB = 'true';

import { codeStatus, kindOf, newResidenceCode, parseCreateCodes, statusQuery, CODE_LIMITS } from '../../services/developments/billing/residenceCodes';

const NOW = new Date('2026-11-09T10:00:00Z');

describe('residence unlock codes: rules', () => {
  it('makes readable codes, RES-XXXX-XXXX, without 0/O/1/I', () => {
    for (let i = 0; i < 200; i += 1) expect(newResidenceCode()).toMatch(/^RES-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(newResidenceCode(() => Buffer.from([0, 1, 2, 3, 31, 32, 255, 64]))).toBe('RES-ABCD-9A9A');
  });

  it('takes what an admin asks for, with sensible defaults', () => {
    expect(parseCreateCodes({ kind: 'pass' }, NOW)).toEqual({ kind: 'pass', discountType: 'percentage', discountValue: 100, count: 1, usageLimit: 1, validUntil: new Date('2027-02-07T23:59:59.999Z') });
    expect(parseCreateCodes({ kind: 'extra_building', discountType: 'percentage', discountValue: 20, count: '5', usageLimit: 3, days: 30, note: '  For Vardar Homes  ' }, NOW)).toEqual({
      kind: 'extra_building', discountType: 'percentage', discountValue: 20, count: 5, usageLimit: 3, validUntil: new Date('2026-12-09T23:59:59.999Z'), note: 'For Vardar Homes',
    });
    expect(parseCreateCodes({ kind: 'pass', discountType: 'fixed', discountValue: '50' }, NOW)).toMatchObject({ discountType: 'fixed', discountValue: 50 });
  });

  it('refuses anything else, naming the field', () => {
    const fails = (body: Record<string, unknown>, code: string, field: string) =>
      expect(() => parseCreateCodes(body, NOW)).toThrow(expect.objectContaining({ code, details: expect.objectContaining({ field }) }));
    fails({ kind: 'lifetime' }, 'FIELD_INVALID', 'kind');
    fails({ kind: 'pass', count: 0 }, 'FIELD_RANGE', 'count');
    fails({ kind: 'pass', count: CODE_LIMITS.maxCount + 1 }, 'FIELD_RANGE', 'count');
    fails({ kind: 'pass', count: 2.5 }, 'FIELD_RANGE', 'count');
    fails({ kind: 'pass', usageLimit: 0 }, 'FIELD_RANGE', 'usageLimit');
    fails({ kind: 'pass', days: 731 }, 'FIELD_RANGE', 'days');
    fails({ kind: 'pass', note: 'x'.repeat(201) }, 'FIELD_TOO_LONG', 'note');
    fails({ kind: 'pass', note: { $gt: '' } }, 'FIELD_INVALID', 'note');
    fails({ kind: 'pass', discountType: 'free' }, 'FIELD_INVALID', 'discountType');
    fails({ kind: 'pass', discountValue: 0 }, 'FIELD_RANGE', 'discountValue');
    fails({ kind: 'pass', discountValue: 101 }, 'FIELD_RANGE', 'discountValue');
    // An amount off must be given (no default), and stays within 1–10 000 €.
    fails({ kind: 'pass', discountType: 'fixed' }, 'FIELD_RANGE', 'discountValue');
    fails({ kind: 'pass', discountType: 'fixed', discountValue: 10001 }, 'FIELD_RANGE', 'discountValue');
  });

  it('says where a code stands', () => {
    const base = { isActive: true, validFrom: new Date('2026-11-01'), validUntil: new Date('2026-12-01'), usedCount: 0, usageLimit: 1 };
    expect(codeStatus(base, NOW)).toBe('active');
    expect(codeStatus({ ...base, usedCount: 1 }, NOW)).toBe('used');
    expect(codeStatus({ ...base, validUntil: new Date('2026-11-08') }, NOW)).toBe('expired');
    expect(codeStatus({ ...base, isActive: false, usedCount: 1 }, NOW)).toBe('disabled');
    expect(codeStatus({ ...base, validFrom: new Date('2026-12-01'), validUntil: new Date('2027-01-01') }, NOW)).toBe('scheduled');
    expect(statusQuery('everything', NOW)).toEqual({});
    expect(statusQuery('disabled', NOW)).toEqual({ isActive: false });
  });

  it('tells the kind from the product a code names', () => {
    expect(kindOf(['residence_pass_yearly'])).toBe('pass');
    expect(kindOf(['residence_extra_building_yearly'])).toBe('extra_building');
  });
});
