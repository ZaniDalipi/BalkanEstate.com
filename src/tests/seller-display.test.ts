/**
 * Seller name resolution + the recently-viewed cache that persists it.
 *
 * Regression guard: property cards printed `seller.name` only when the field
 * happened to be populated, so every listing reached through a path that skips
 * `transformBackendProperty` (a shared link, a page refresh) collapsed to a bare
 * "Private Seller" badge — and the recently-viewed carousel cached that
 * seller-less snapshot into localStorage, where it stayed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Seller } from '@/types';
import {
  getSellerDisplayName,
  getSellerRoleLabel,
  hasSellerName,
} from '@/shared/utils/seller';
import { validateSellerDisplayName } from '@/shared/utils/validation';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

const LABELS = { agent: 'Agent', private: 'Private Seller' };

const seller = (overrides: Partial<Seller>): Seller => ({
  type: 'private',
  name: '',
  phone: '',
  ...overrides,
});

describe('validateSellerDisplayName', () => {
  it('accepts names across the scripts the site ships in', () => {
    for (const name of ['Marko Petrović', 'Марко Петровић', 'Νίκος Παπαδόπουλος', 'RE/MAX 21']) {
      expect(validateSellerDisplayName(name).isValid).toBe(true);
    }
  });

  it('rejects empty, missing and placeholder values', () => {
    for (const name of ['', '   ', 'undefined', 'null', 'N/A', '-', 'Unknown', undefined, null, 42]) {
      expect(validateSellerDisplayName(name).isValid).toBe(false);
    }
  });

  it('rejects raw and obfuscated identifiers that leaked into the name field', () => {
    expect(validateSellerDisplayName('507f1f77bcf86cd799439011').isValid).toBe(false);
    expect(validateSellerDisplayName('Bd3x_9Kq2mZ4tR7a').isValid).toBe(false);
  });

  it('still accepts a long single-word surname of identifier length', () => {
    expect(validateSellerDisplayName('Konstantinopoulo').isValid).toBe(true);
  });
});

describe('getSellerDisplayName', () => {
  it('prefers the seller’s own name', () => {
    const result = getSellerDisplayName(seller({ name: 'Ana Kovačević', type: 'agent' }), LABELS);
    expect(result).toMatchObject({ name: 'Ana Kovačević', source: 'seller', isFallback: false });
  });

  it('falls back to the agency name when the person has none', () => {
    const result = getSellerDisplayName(
      seller({ type: 'agent', agencyName: 'Adriatic Properties' }),
      LABELS
    );
    expect(result).toMatchObject({ name: 'Adriatic Properties', source: 'agency', isFallback: false });
  });

  it('falls back to the role label, never to an empty string', () => {
    expect(getSellerDisplayName(seller({}), LABELS)).toMatchObject({
      name: 'Private Seller',
      source: 'role',
      isFallback: true,
    });
    expect(getSellerDisplayName(seller({ type: 'agent' }), LABELS)).toMatchObject({
      name: 'Agent',
      isFallback: true,
    });
    expect(getSellerDisplayName(undefined, LABELS).name).toBe('Private Seller');
  });

  it('does not render a placeholder or an id as a name', () => {
    expect(getSellerDisplayName(seller({ name: 'undefined' }), LABELS).isFallback).toBe(true);
    expect(getSellerDisplayName(seller({ name: '507f1f77bcf86cd799439011' }), LABELS).isFallback).toBe(true);
  });

  it('strips markup out of a name before it reaches the DOM', () => {
    expect(getSellerDisplayName(seller({ name: '  <b>Marko</b>  ' }), LABELS).name).toBe('bMarko/b');
  });
});

describe('getSellerRoleLabel', () => {
  it('labels agents and treats everything else as a private seller', () => {
    expect(getSellerRoleLabel(seller({ type: 'agent' }), LABELS)).toBe('Agent');
    expect(getSellerRoleLabel(seller({ type: 'private' }), LABELS)).toBe('Private Seller');
    expect(getSellerRoleLabel(null, LABELS)).toBe('Private Seller');
  });
});

describe('useRecentlyViewed', () => {
  // The global setup stubs localStorage with bare `vi.fn()`s that never store
  // anything; give it a real in-memory backing store so reads see writes.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => store.get(key) ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key: string, value: string) => {
      store.set(key, value);
    });
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      store.delete(key);
    });
    vi.mocked(localStorage.clear).mockImplementation(() => store.clear());
    localStorage.clear();
  });

  const property = (overrides: Record<string, unknown> = {}) =>
    ({ id: 'p1', price: 100, city: 'Tirana', country: 'Albania', ...overrides }) as any;

  it('keeps the seller name when a later, thinner snapshot of the same listing arrives', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.trackView(property({ seller: seller({ name: 'Ana Kovačević', type: 'agent' }) }));
    });
    // The detail page re-tracks from cached data that carries no seller
    act(() => {
      result.current.trackView(property({ seller: undefined }));
    });

    expect(result.current.recentlyViewed).toHaveLength(1);
    expect(result.current.recentlyViewed[0].seller?.name).toBe('Ana Kovačević');
  });

  it('upgrades a seller-less entry once the full record loads', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.trackView(property({ seller: undefined }));
    });
    act(() => {
      result.current.trackView(property({ seller: seller({ name: 'Marko Petrović' }) }));
    });

    expect(result.current.recentlyViewed[0].seller?.name).toBe('Marko Petrović');
  });

  it('ignores a property with no id instead of caching an unrenderable entry', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.trackView(property({ id: undefined }));
    });

    expect(result.current.recentlyViewed).toHaveLength(0);
  });

  it('recovers from corrupt storage rather than throwing on read', () => {
    localStorage.setItem('balkan_recently_viewed', '{"not":"an array"}');
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.recentlyViewed).toEqual([]);
  });

  it('drops entries that lost their id', () => {
    localStorage.setItem(
      'balkan_recently_viewed',
      JSON.stringify([{ id: 'p1' }, { price: 1 }, null])
    );
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.recentlyViewed).toHaveLength(1);
  });
});
