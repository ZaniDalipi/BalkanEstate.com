import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AUTH_RETURN_TTL_MS, readFresh, rememberReturnPath, rememberSignInOrigin, safeReturnPath, signedInLandingPage, signInDestination, takeReturnPath,
} from './authReturn';

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

describe('signInDestination', () => {
  const search = '/search';

  it('goes back to the remembered page', () => {
    expect(signInDestination('/en/property/abc', '/en/auth/callback', search)).toBe('/en/property/abc');
  });

  it('stays put when already on the remembered page, so an open photo is kept', () => {
    expect(signInDestination('/en/property/abc', '/en/property/abc', search)).toBeNull();
  });

  it('stays on the current page when nothing was remembered', () => {
    expect(signInDestination(null, '/en/agents/42', search)).toBeNull();
  });

  it('falls back to search from a sign-in page with nothing remembered', () => {
    expect(signInDestination(null, '/en/login', search)).toBe(search);
    expect(signInDestination(null, '/en/auth/callback', search)).toBe(search);
  });
});

describe('rememberSignInOrigin', () => {
  // The test setup stubs sessionStorage with vi.fn()s; back it with a real map here.
  const store = new Map<string, string>();
  const storage = window.sessionStorage as unknown as Record<string, ReturnType<typeof vi.fn>>;
  beforeEach(() => {
    store.clear();
    storage.getItem.mockImplementation((k: string) => store.get(k) ?? null);
    storage.setItem.mockImplementation((k: string, v: string) => void store.set(k, v));
    storage.removeItem.mockImplementation((k: string) => void store.delete(k));
  });

  it('remembers the page the sign-in window opened over', () => {
    rememberSignInOrigin('/en/property/abc?tab=photos');
    expect(takeReturnPath()).toBe('/en/property/abc?tab=photos');
  });

  it('replaces an older page with the newest one', () => {
    rememberReturnPath('/en/developments/old');
    rememberSignInOrigin('/en/property/new');
    expect(takeReturnPath()).toBe('/en/property/new');
  });

  it('drops an older page when opened on /login, which has nothing to return to', () => {
    rememberReturnPath('/en/developments/old');
    rememberSignInOrigin('/en/login');
    expect(takeReturnPath()).toBeNull();
  });
});

describe('signedInLandingPage', () => {
  it('returns the last page the user had open', () => {
    expect(signedInLandingPage('/en/property/abc', '/')).toBe('/en/property/abc');
  });

  it('goes home when there is no last page, or it is not a same-site page', () => {
    expect(signedInLandingPage(null, '/')).toBe('/');
    expect(signedInLandingPage('https://evil.test/', '/')).toBe('/');
    expect(signedInLandingPage('/en/login', '/')).toBe('/');
  });
});
