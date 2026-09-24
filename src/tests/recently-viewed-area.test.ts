/**
 * The size the Recently Viewed carousel shows.
 *
 * Its entries are snapshots in localStorage, which outlive the listings they
 * were taken from — so an entry captured while a villa's stored total said
 * 500 would still say 500 after the listing itself began reading 1500. The
 * snapshot carries the breakdown, so the hook works the size out again on the
 * way out rather than trusting what was written down.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecentlyViewed } from '@/src/hooks/useRecentlyViewed';

const STORAGE_KEY = 'balkan_recently_viewed';

/** An entry written before the rule changed: stale total, real breakdown. */
const staleVilla = {
  id: 'villa-1',
  title: 'Test',
  price: 0,
  imageUrl: '',
  city: 'Resen',
  country: 'North Macedonia',
  address: 'Krani',
  propertyType: 'luxury-villa',
  listingType: 'sale',
  seller: { type: 'agent', name: 'Balkan Estate AI', phone: '' },
  sqft: 500,
  landArea: 1500,
  buildingArea: 500,
};

/** The suite stubs localStorage globally, so feed the hook through getItem. */
const seed = (entries: unknown[]) =>
  vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
    (key === STORAGE_KEY ? JSON.stringify(entries) : null));

beforeEach(() => vi.mocked(localStorage.getItem).mockReset());

describe('a snapshot cached before the rule changed', () => {
  it('reads the plot, not the 500 it was cached with', () => {
    seed([staleVilla]);

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.recentlyViewed[0].sqft).toBe(1500);
  });

  it('keeps a snapshot whose only figure is its stated total', () => {
    seed([{ ...staleVilla, propertyType: 'apartment', sqft: 82, landArea: undefined, buildingArea: undefined }]);

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.recentlyViewed[0].sqft).toBe(82);
  });

  it('leaves a snapshot that states no size at 0 rather than inventing one', () => {
    seed([{ ...staleVilla, propertyType: 'parking', sqft: 0, landArea: undefined, buildingArea: undefined }]);

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.recentlyViewed[0].sqft).toBe(0);
  });
});
