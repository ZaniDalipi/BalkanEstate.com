import { describe, it, expect } from 'vitest';
import { AUTH_RETURN_TTL_MS, readFresh, safeReturnPath } from './authReturn';

describe('safeReturnPath', () => {
  it('accepts same-site paths with their query', () => {
    expect(safeReturnPath('/en/developments/plaza?b=x&unit=y')).toBe('/en/developments/plaza?b=x&unit=y');
  });

  it('refuses other sites, protocol-relative and odd values', () => {
    expect(safeReturnPath('https://evil.test/')).toBeNull();
    expect(safeReturnPath('//evil.test/x')).toBeNull();
    expect(safeReturnPath('/\\evil.test')).toBeNull();
    expect(safeReturnPath('javascript:alert(1)')).toBeNull();
    expect(safeReturnPath(42)).toBeNull();
  });

  it('never returns to a sign-in page', () => {
    expect(safeReturnPath('/en/login')).toBeNull();
    expect(safeReturnPath('/auth/callback?token=x')).toBeNull();
    expect(safeReturnPath('/sq/register')).toBeNull();
  });
});

describe('readFresh', () => {
  const now = 1_000_000_000;
  it('returns a value saved within the time limit', () => {
    expect(readFresh(JSON.stringify({ value: '/x', at: now - 1000 }), now)).toBe('/x');
  });

  it('drops expired, future-dated and broken entries', () => {
    expect(readFresh(JSON.stringify({ value: '/x', at: now - AUTH_RETURN_TTL_MS - 1 }), now)).toBeNull();
    expect(readFresh(JSON.stringify({ value: '/x', at: now + 5000 }), now)).toBeNull();
    expect(readFresh('{not json', now)).toBeNull();
    expect(readFresh(null, now)).toBeNull();
  });
});
