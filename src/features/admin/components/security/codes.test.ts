import { describe, expect, it } from 'vitest';
import { apiErrorCode, isCompleteCode, normalizeCode } from './codes';

describe('normalizeCode', () => {
  it('keeps the digits of a pasted code, at most 6', () => {
    expect(normalizeCode(' 123 456 ')).toBe('123456');
    expect(normalizeCode('123-4567')).toBe('123456');
    expect(normalizeCode('abc')).toBe('');
  });
});

describe('isCompleteCode', () => {
  it('needs exactly 6 digits', () => {
    expect(isCompleteCode('123456')).toBe(true);
    expect(isCompleteCode('12345')).toBe(false);
  });
});

describe('apiErrorCode', () => {
  it('reads the server reason from a refused request', () => {
    expect(apiErrorCode(Object.assign(new Error('x'), { details: { error: 'EMAIL_CODE_INVALID' } }))).toBe('EMAIL_CODE_INVALID');
    expect(apiErrorCode(new Error('x'))).toBeUndefined();
  });
});
