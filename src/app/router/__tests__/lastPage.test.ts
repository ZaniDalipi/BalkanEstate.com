import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readLastPage, rememberLastPage } from '../lastPage';

// The test setup stubs sessionStorage with vi.fn()s; back it with a real map here.
const store = new Map<string, string>();
const storage = window.sessionStorage as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  store.clear();
  storage.getItem.mockImplementation((k: string) => store.get(k) ?? null);
  storage.setItem.mockImplementation((k: string, v: string) => void store.set(k, v));
});

describe('lastPage', () => {
  it('remembers the page the user had open, with its query', () => {
    rememberLastPage('/en/property/abc?photo=2');
    expect(readLastPage()).toBe('/en/property/abc?photo=2');
  });

  it('keeps the previous page when a sign-in page opens', () => {
    rememberLastPage('/en/agents/12');
    rememberLastPage('/en/login');
    expect(readLastPage()).toBe('/en/agents/12');
  });

  it('ignores a stored value that is not a same-site page', () => {
    store.set('be:lastPage', 'https://evil.test/');
    expect(readLastPage()).toBeNull();
  });

  it('reads nothing when storage is unavailable', () => {
    storage.getItem.mockImplementation(() => { throw new Error('blocked'); });
    expect(readLastPage()).toBeNull();
  });
});
