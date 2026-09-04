import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const fetchPlacePredictions = vi.fn();
const resolvePlaceDetails = vi.fn();
const isPlacesAvailable = vi.fn();
const searchLocation = vi.fn();

vi.mock('@/src/features/seller/api/placesAutocomplete', () => ({
  fetchPlacePredictions: (...args: unknown[]) => fetchPlacePredictions(...args),
  resolvePlaceDetails: (...args: unknown[]) => resolvePlaceDetails(...args),
  isPlacesAvailable: () => isPlacesAvailable(),
  createSessionToken: () => 'token',
}));

vi.mock('@/services/osmService', () => ({
  searchLocation: (...args: unknown[]) => searchLocation(...args),
  reverseGeocode: vi.fn(),
}));

const { useLocationSearch, getCountryCode } = await import('@/src/features/seller/hooks/useLocationSearch');

const VLORE = { lat: 40.4686, lng: 19.4914 };
const vloreOptions = { country: 'Albania', city: 'Vlore', cityCentre: VLORE };

const osmResult = (overrides: Record<string, unknown> = {}) => ({
  place_id: 1,
  licence: '',
  osm_type: 'node',
  osm_id: 1,
  boundingbox: ['0', '0', '0', '0'],
  lat: '40.1017',
  lon: '19.7442',
  display_name: 'Himarë, Vlorë County, Albania',
  class: 'place',
  type: 'town',
  importance: 0.3,
  ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  fetchPlacePredictions.mockReset().mockResolvedValue([]);
  resolvePlaceDetails.mockReset().mockResolvedValue(null);
  isPlacesAvailable.mockReset().mockReturnValue(false);
  searchLocation.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Type a query, run the debounce, and let the async sources settle. */
const search = async (result: { current: ReturnType<typeof useLocationSearch> }, query: string) => {
  act(() => {
    result.current.setQuery(query);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
};

describe('getCountryCode', () => {
  it('maps country names to ISO codes', () => {
    expect(getCountryCode('Albania')).toBe('AL');
    expect(getCountryCode('bosnia and herzegovina')).toBe('BA');
    expect(getCountryCode('Atlantis')).toBeUndefined();
    expect(getCountryCode(undefined)).toBeUndefined();
  });
});

describe('useLocationSearch', () => {
  it('finds a curated locality with no remote source available', async () => {
    const { result } = renderHook(() => useLocationSearch(vloreOptions));

    await search(result, 'palase');

    expect(result.current.suggestions[0]).toMatchObject({ title: 'Palasë', source: 'local' });
    expect(result.current.isSearching).toBe(false);
  });

  it('does not search below the minimum query length', async () => {
    const { result } = renderHook(() => useLocationSearch(vloreOptions));

    await search(result, 'p');

    expect(result.current.suggestions).toEqual([]);
    expect(searchLocation).not.toHaveBeenCalled();
  });

  it('merges Google predictions after the curated matches', async () => {
    isPlacesAvailable.mockReturnValue(true);
    fetchPlacePredictions.mockResolvedValue([
      { placeId: 'p1', title: 'Palasë Beach', subtitle: 'Himarë, Albania', distanceKm: 31 },
    ]);

    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'palase');

    expect(result.current.suggestions.map((s) => s.source)).toEqual(['local', 'google']);
  });

  it('keeps a Google prediction far from the selected city', async () => {
    // Proximity to the chosen city is a ranking bias, never a filter: a seller
    // may pick Vlorë from the list and pin an address hundreds of km away.
    isPlacesAvailable.mockReturnValue(true);
    fetchPlacePredictions.mockResolvedValue([
      { placeId: 'far', title: 'Palasovo', subtitle: 'Somewhere else', distanceKm: 400 },
    ]);

    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'palase');

    expect(result.current.suggestions.some((s) => s.source === 'google')).toBe(true);
  });

  it('falls back to the geocoder when the other sources are thin', async () => {
    searchLocation.mockResolvedValue([osmResult()]);

    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'himare');

    expect(searchLocation).toHaveBeenCalledWith('himare', 'AL', { near: VLORE, radiusKm: 100 });
    // The curated Himarë entry wins; the same place from OSM is de-duplicated away.
    expect(result.current.suggestions.filter((s) => s.title === 'Himarë')).toHaveLength(1);
  });

  it('keeps two same-named places that are genuinely far apart', async () => {
    // Zaton is a curated locality near Dubrovnik; a second, unrelated Zaton
    // 40km up the coast must not be collapsed into it.
    searchLocation.mockResolvedValue([
      osmResult({ place_id: 21, lat: '42.6900', lon: '18.0400', display_name: 'Zaton, Dubrovnik, Croatia' }),
      osmResult({ place_id: 22, lat: '42.9500', lon: '17.7500', display_name: 'Zaton, Croatia' }),
    ]);

    const { result } = renderHook(() =>
      useLocationSearch({ country: 'Croatia', city: 'Dubrovnik', cityCentre: { lat: 42.6507, lng: 18.0944 } })
    );
    await search(result, 'zaton');

    const zatons = result.current.suggestions.filter((s) => s.title === 'Zaton');
    expect(zatons).toHaveLength(2);
    // The curated entry survives the collision with its own OSM duplicate.
    expect(zatons[0].source).toBe('local');
  });

  it('keeps a geocoder result in another country entirely', async () => {
    // Zagreb, while the form's city is Vlorë. The seller is free to pin it.
    searchLocation.mockResolvedValue([
      osmResult({ place_id: 9, lat: '45.8150', lon: '15.9819', display_name: 'Zagreb, Croatia' }),
    ]);

    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'zagreb');

    expect(result.current.suggestions.map((s) => s.title)).toContain('Zagreb');
  });

  it('resolves a local suggestion without a network call', async () => {
    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'palase');

    const resolved = await result.current.resolveSuggestion(result.current.suggestions[0]);

    expect(resolved).toMatchObject({ lat: 40.2033, lng: 19.5967 });
    expect(resolvePlaceDetails).not.toHaveBeenCalled();
  });

  it('resolves a Google suggestion through the details lookup, keeping the app\'s address shape', async () => {
    isPlacesAvailable.mockReturnValue(true);
    fetchPlacePredictions.mockResolvedValue([
      { placeId: 'p1', title: 'Dhërmi Beach Road', subtitle: 'Albania', distanceKm: 38 },
    ]);
    resolvePlaceDetails.mockResolvedValue({
      lat: 40.15,
      lng: 19.6417,
      formattedAddress: 'Dhërmi, Albania',
    });

    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'dhermi');

    const googleSuggestion = result.current.suggestions.find((s) => s.source === 'google')!;
    const resolved = await result.current.resolveSuggestion(googleSuggestion);

    // The coordinates come from Google; the address does not. Google's
    // formatted address is in Google's shape, and the app files every listing
    // under one shape: <place>, <the city being listed in>, <country>.
    expect(resolved).toEqual({
      lat: 40.15,
      lng: 19.6417,
      address: 'Dhërmi Beach Road, Vlorë, Albania',
    });
  });

  it('returns null when a Google suggestion cannot be resolved', async () => {
    isPlacesAvailable.mockReturnValue(true);
    fetchPlacePredictions.mockResolvedValue([
      { placeId: 'p1', title: 'Nowhere', subtitle: '', distanceKm: 1 },
    ]);
    resolvePlaceDetails.mockResolvedValue(null);

    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'nowhere');

    const suggestion = result.current.suggestions.find((s) => s.source === 'google')!;
    expect(await result.current.resolveSuggestion(suggestion)).toBeNull();
  });

  it('ignores results from a superseded keystroke', async () => {
    const { result } = renderHook(() => useLocationSearch(vloreOptions));

    act(() => {
      result.current.setQuery('palase');
    });
    act(() => {
      result.current.setQuery('himare');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.suggestions[0]?.title).toBe('Himarë');
  });

  it('clears suggestions on reset', async () => {
    const { result } = renderHook(() => useLocationSearch(vloreOptions));
    await search(result, 'palase');
    expect(result.current.suggestions.length).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.suggestions).toEqual([]);
  });
});
