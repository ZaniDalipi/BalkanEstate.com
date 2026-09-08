import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

/**
 * Searching the rent page.
 *
 * The complaint these cover: typing a place into the rent page's search box
 * did nothing — the map stayed where it was, because the page's `handleSearch`
 * was a no-op. It now runs the buy page's search (parse the sentence, ask the
 * gazetteer, then the geocoder) with the rent tab's own constraint: whatever
 * the sentence says, the listings stay rentals.
 */

const searchLocation = vi.fn();

vi.mock('@/services/osmService', () => ({
  searchLocation: (...args: unknown[]) => searchLocation(...args),
  getZoomFromBoundingBox: () => 13,
  reverseGeocode: vi.fn(),
}));

vi.mock('@/services/geminiService', () => ({
  generateSearchName: vi.fn().mockResolvedValue('Search'),
  generateSearchNameFromCoords: vi.fn().mockResolvedValue('Area'),
}));

vi.mock('@/src/features/properties/hooks', () => ({
  useRealtimeProperties: () => {},
}));

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

const dispatch = vi.fn();
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    state: {
      isAuthenticated: false,
      currentUser: null,
      searchPageState: { focusMapOnProperty: null },
    },
    dispatch,
    updateSearchPageState: vi.fn(),
    addSavedSearch: vi.fn(),
  }),
}));

const { useRentalSearch } = await import('@/src/features/rental/hooks/useRentalSearch');

const rental = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  title: 'Apartment in Tirana',
  address: 'Rruga e Kavajes 12',
  city: 'Tirana',
  country: 'Albania',
  lat: 41.3275,
  lng: 19.8187,
  price: 500,
  beds: 2,
  baths: 1,
  sqft: 70,
  propertyType: 'apartment',
  listingType: 'rent',
  status: 'available',
  seller: { type: 'private', name: '', phone: '' },
  createdAt: 1,
  ...overrides,
});

beforeEach(() => {
  searchLocation.mockReset().mockResolvedValue([]);
  dispatch.mockReset();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ properties: [rental()] }),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Mount the hook and let the initial rentals fetch settle. */
const mountHook = async () => {
  const view = renderHook(() => useRentalSearch());
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
};

describe('useRentalSearch — searching', () => {
  it('flies the map to a place the app already knows, without asking the geocoder', async () => {
    const { result } = await mountHook();

    await act(async () => {
      await result.current.handleSearch('Tirana');
    });

    expect(result.current.flyToTarget?.center[0]).toBeCloseTo(41.3275, 2);
    expect(result.current.flyToTarget?.center[1]).toBeCloseTo(19.8187, 2);
    expect(searchLocation).not.toHaveBeenCalled();
  });

  it('geocodes an address the gazetteer has never heard of, and flies there', async () => {
    searchLocation.mockResolvedValue([
      { lat: '41.3200', lon: '19.8100', boundingbox: ['0', '0', '0', '0'], display_name: 'Rruga e Kavajes 12' },
    ]);
    const { result } = await mountHook();

    await act(async () => {
      await result.current.handleSearch('Rruga e Kavajes 12');
    });

    expect(searchLocation).toHaveBeenCalledWith('Rruga e Kavajes 12');
    expect(result.current.flyToTarget).toEqual({ center: [41.32, 19.81], zoom: 13 });
  });

  it('reads filters out of the sentence but never leaves the rent listings', async () => {
    const { result } = await mountHook();

    await act(async () => {
      await result.current.handleSearch('2 bedroom apartment in Tirana for sale');
    });

    expect(result.current.filters.beds).toBe(2);
    expect(result.current.filters.listingType).toBe('rent');
    expect(result.current.activeFilters.listingType).toBe('rent');
  });

  it('does not empty the list while a place name is still being typed', async () => {
    const { result } = await mountHook();
    // Fake timers only now: the mount above waits on a real promise.
    vi.useFakeTimers();

    act(() => {
      result.current.handleFilterChange('query', 'Tir');
    });

    // The box shows the keystroke; the applied filters have not moved yet.
    expect(result.current.filters.query).toBe('Tir');
    expect(result.current.activeFilters.query).toBe('');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.activeFilters.query).toBe('Tir');
  });

  it('falls back to what is in the area when the typed text matches no rental', async () => {
    const { result } = await mountHook();

    // An address none of the listings carry in its own text.
    await act(async () => {
      await result.current.handleSearch('Bulevardi Zogu i Pare 88');
    });

    // Nothing text-matches the address, so the map view answers instead of an
    // empty page — and the page is told the answer is a looser one.
    expect(result.current.listProperties).toHaveLength(1);
    expect(result.current.isTextRelaxed).toBe(true);
  });
});
