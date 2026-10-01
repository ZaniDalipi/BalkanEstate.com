/**
 * Retention periods come from env vars; a typo must fall back to the default
 * (and be reported), never purge early.
 */
process.env.SKIP_TEST_DB = 'true';

import {
  DEFAULT_MEDIA_RETENTION,
  readMediaRetentionPolicy,
  retentionCutoff,
  validateRetentionYears,
} from '../services/media/mediaRetentionPolicy';

describe('validateRetentionYears', () => {
  it('accepts positive years up to 20, and unset', () => {
    expect(validateRetentionYears('1').isValid).toBe(true);
    expect(validateRetentionYears('0.5').isValid).toBe(true);
    expect(validateRetentionYears(undefined).isValid).toBe(true);
  });

  it('rejects zero, negatives, huge and non-numbers', () => {
    expect(validateRetentionYears('0').isValid).toBe(false);
    expect(validateRetentionYears('-1').isValid).toBe(false);
    expect(validateRetentionYears('25').isValid).toBe(false);
    expect(validateRetentionYears('two').isValid).toBe(false);
  });
});

describe('readMediaRetentionPolicy', () => {
  it('uses defaults when nothing is set', () => {
    expect(readMediaRetentionPolicy({})).toEqual(DEFAULT_MEDIA_RETENTION);
  });

  it('reads valid values', () => {
    expect(readMediaRetentionPolicy({ MEDIA_RETENTION_DELETED_YEARS: '3', MEDIA_RETENTION_SOLD_YEARS: '5' })).toEqual({
      deletedYears: 3,
      soldYears: 5,
    });
  });

  it('falls back and reports an invalid value', () => {
    const onInvalid = jest.fn();
    const policy = readMediaRetentionPolicy({ MEDIA_RETENTION_SOLD_YEARS: '0' }, onInvalid);
    expect(policy.soldYears).toBe(DEFAULT_MEDIA_RETENTION.soldYears);
    expect(onInvalid).toHaveBeenCalledWith('MEDIA_RETENTION_SOLD_YEARS', expect.any(String));
  });
});

describe('retentionCutoff', () => {
  it('is the given number of years before now', () => {
    const now = new Date('2026-09-28T00:00:00Z');
    expect(retentionCutoff(1, now).toISOString().slice(0, 10)).toBe('2025-09-27');
  });
});
