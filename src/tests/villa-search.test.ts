import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

/**
 * Searching the luxury villas page.
 *
 * Same complaint the rent page had: typing a place did nothing to the map,
 * because `handleSearch` only refetched the collection. It now runs the buy
 * page's search — parse the sentence, ask the gazetteer, then the geocoder —
 * with the villa page's own two rules: the collection stays luxury villas,
 * and "for sale" in the sentence moves the market tabs rather than being
 * ignored.
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

// One stable `t`, and one stable object around it: a hook that re-creates
// `t` on every render invalidates every callback that depends on it, which in
// this hook means re-firing the fetch effect forever.
const translate = (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key);
const translation = { t: translate };
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => translation,
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

const { useVillaSearch } = await import('@/src/features/villas/hooks/useVillaSearch');

const villa = (overrides: Record<string, unknown> = {}) => ({
  id: 'v1',
  title: 'Villa in Budva',
  address: 'Jadranski put 4',
  city: 'Budva',
  country: 'Montenegro',
  lat: 42.2911,
  lng: 18.8401,
  price: 2000,
  beds: 4,
  baths: 3,
  sqft: 300,
  propertyType: 'luxury-villa',
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
    json: async () => ({ properties: [villa()], pagination: { total: 1 } }),
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Mount the hook and let the initial villa fetch settle. */
const mountHook = async () => {
  const view = renderHook(() => useVillaSearch());
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
};

describe('useVillaSearch — searching', () => {
  it('flies the map to a place the app already knows, without asking the geocoder', async () => {
    const { result } = await mountHook();

    await act(async () => {
      await result.current.handleSearch('Budva');
    });

    expect(result.current.flyToTarget?.center[0]).toBeCloseTo(42.29, 1);
    expect(result.current.flyToTarget?.center[1]).toBeCloseTo(18.84, 1);
    expect(searchLocation).not.toHaveBeenCalled();
  });

  it('geocodes an address the gazetteer has never heard of, and flies there', async () => {
    searchLocation.mockResolvedValue([
      { lat: '42.2800', lon: '18.8300', boundingbox: ['0', '0', '0', '0'], display_name: 'Jadranski put 4' },
    ]);
    const { result } = await mountHook();

    await act(async () => {
      await result.current.handleSearch('Obala Iva Novakovica 3');
    });

    expect(searchLocation).toHaveBeenCalledWith('Obala Iva Novakovica 3');
    expect(result.current.flyToTarget).toEqual({ center: [42.28, 18.83], zoom: 13 });
  });

  it('stays on luxury villas but lets the sentence move the market', async () => {
    const { result } = await mountHook();

    await act(async () => {
      await result.current.handleSearch('4 bedroom villa in Budva for sale');
    });

    expect(result.current.filters.beds).toBe(4);
    expect(result.current.filters.propertyType).toBe('luxury-villa');
    expect(result.current.activeFilters.propertyType).toBe('luxury-villa');
    expect(result.current.listingMode).toBe('sale');
  });

  it('does not empty the list while a place name is still being typed', async () => {
    const { result } = await mountHook();
    // Fake timers only now: the mount above waits on a real promise.
    vi.useFakeTimers();

    act(() => {
      result.current.handleFilterChange('query', 'Bud');
    });

    expect(result.current.filters.query).toBe('Bud');
    expect(result.current.activeFilters.query).toBe('');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.activeFilters.query).toBe('Bud');
  });

  it('falls back to what is in the area when the typed text matches no villa', async () => {
    const { result } = await mountHook();

    // An address none of the listings carry in its own text.
    await act(async () => {
      await result.current.handleSearch('Obala Iva Novakovica 3');
    });

    expect(result.current.listProperties).toHaveLength(1);
    expect(result.current.isTextRelaxed).toBe(true);
  });

  it('searches a destination chip without a lookup, and toggles it off', async () => {
    const { result } = await mountHook();
    const destination = { query: 'Budva', center: [42.2911, 18.8401] as [number, number], zoom: 12 };

    act(() => {
      result.current.handleDestinationSelect(destination);
    });
    expect(result.current.activeFilters.query).toBe('Budva');
    expect(result.current.flyToTarget).toEqual({ center: destination.center, zoom: 12 });
    expect(searchLocation).not.toHaveBeenCalled();

    // Clicking the active chip again clears it and leaves the map alone.
    act(() => {
      result.current.handleDestinationSelect(destination);
    });
    expect(result.current.activeFilters.query).toBe('');
  });
});
