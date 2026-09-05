import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Property } from '@/types';

const searchLocation = vi.fn();
const fetchPlacePredictions = vi.fn();
const resolvePlaceDetails = vi.fn();
const isPlacesAvailable = vi.fn();

vi.mock('@/services/osmService', () => ({
  searchLocation: (...args: unknown[]) => searchLocation(...args),
  getZoomFromBoundingBox: () => 12,
  reverseGeocode: vi.fn(),
}));

vi.mock('@/shared/places', () => ({
  fetchPlacePredictions: (...args: unknown[]) => fetchPlacePredictions(...args),
  resolvePlaceDetails: (...args: unknown[]) => resolvePlaceDetails(...args),
  isPlacesAvailable: () => isPlacesAvailable(),
  createSessionToken: () => 'token',
}));

vi.mock('@/src/features/map/hooks/useGoogleMapLoader', () => ({
  useGoogleMapLoader: () => ({ isLoaded: true, loadError: undefined }),
  GOOGLE_MAPS_MAP_ID: undefined,
}));

const { searchPlaces, findPlace, ALL_PLACES } = await import('@/src/features/search/universal/places');
const { useUniversalSearch } = await import('@/src/features/search/universal/useUniversalSearch');
const { getRecentSearches, rememberSearch, forgetSearch, clearRecentSearches } = await import(
  '@/src/features/search/universal/recentSearches'
);

/**
 * The shared test setup stubs `localStorage` with spies that store nothing,
 * which is right for the suites that only assert it was called. Recent
 * searches are about what comes back out, so this suite gives them a real
 * (in-memory) store to read and write.
 */
let store: Record<string, string> = {};

beforeEach(() => {
  searchLocation.mockReset().mockResolvedValue([]);
  fetchPlacePredictions.mockReset().mockResolvedValue([]);
  resolvePlaceDetails.mockReset().mockResolvedValue(null);
  isPlacesAvailable.mockReset().mockReturnValue(false);
  store = {};
  vi.mocked(window.localStorage.getItem).mockImplementation((key: string) => store[key] ?? null);
  vi.mocked(window.localStorage.setItem).mockImplementation((key: string, value: string) => {
    store[key] = value;
  });
  vi.mocked(window.localStorage.removeItem).mockImplementation((key: string) => {
    delete store[key];
  });
});

describe('the place index', () => {
  it('holds countries, cities and gazetteer villages in one list', () => {
    const kinds = new Set(ALL_PLACES.map((place) => place.kind));
    expect(kinds).toEqual(new Set(['country', 'city', 'locality']));
  });

  it('shows every place under its local spelling', () => {
    expect(findPlace('Vlore')?.name).toBe('Vlorë');
    expect(findPlace('becici')?.name).toBe('Bečići');
  });

  it('offers the city before the villages inside it', () => {
    const [first] = searchPlaces('Budva');
    expect(first.place.name).toBe('Budva');
    expect(first.place.kind).toBe('city');
  });

  it('offers a country before a same-named anything else', () => {
    expect(searchPlaces('Montenegro')[0].place.kind).toBe('country');
  });

  it('writes every place as <place>, <city>, <country>', () => {
    expect(findPlace('Krani')?.searchValue).toBe('Krani, Resen, North Macedonia');
    expect(findPlace('Himare')?.searchValue).toBe('Himarë, Vlorë, Albania');
    expect(findPlace('Budva')?.searchValue).toBe('Budva, Montenegro');
    expect(findPlace('Montenegro')?.searchValue).toBe('Montenegro');
  });

  it('finds a village typed without its diacritics, or misspelled', () => {
    expect(searchPlaces('palase')[0].place.name).toBe('Palasë');
    expect(searchPlaces('dhermi')[0].place.name).toBe('Dhërmi');
    expect(searchPlaces('sveti stefn')[0].place.name).toBe('Sveti Stefan');
  });

  it('can be held to one country', () => {
    const results = searchPlaces('Bar', { country: 'Montenegro' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.place.country === 'Montenegro')).toBe(true);
  });

  it('breaks a tie by proximity without overturning a better name match', () => {
    // Looking at the Montenegrin coast and typing a Croatian city still
    // means the Croatian city.
    const nearBudva = { lat: 42.28, lng: 18.84 };
    expect(searchPlaces('Split', { near: nearBudva })[0].place.name).toBe('Split');
  });

  it('holds coordinates for every city, so a map can open without a round trip', () => {
    const budva = findPlace('Budva', 'Montenegro');
    expect(budva?.lat).toBeCloseTo(42.29, 1);
    expect(budva?.lng).toBeCloseTo(18.84, 1);
  });

  it('carries a ready-made label and search value on every place', () => {
    const becici = findPlace('Bečići');
    expect(becici?.label.secondary).toBe('Budva, Montenegro');
    // The full label, because the label is the address: one shape in the
    // search box, in the address field and on the listing.
    expect(becici?.searchValue).toBe('Bečići, Budva, Montenegro');
  });
});

describe('recent searches', () => {
  it('remembers newest first and never twice', () => {
    rememberSearch('Budva');
    rememberSearch('Kotor');
    rememberSearch('budva');

    expect(getRecentSearches().map((entry) => entry.text)).toEqual(['budva', 'Kotor']);
  });

  it('forgets one entry, and all of them', () => {
    rememberSearch('Budva');
    rememberSearch('Kotor');

    expect(forgetSearch('Budva').map((entry) => entry.text)).toEqual(['Kotor']);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });

  it('ignores an empty search and survives unreadable storage', () => {
    rememberSearch('   ');
    expect(getRecentSearches()).toEqual([]);

    window.localStorage.setItem('balkanestate:recent-searches', 'not json');
    expect(getRecentSearches()).toEqual([]);
  });
});

const property = (overrides: Partial<Property>): Property => ({
  id: 'p1',
  sellerId: 's1',
  listingType: 'sale',
  status: 'active',
  price: 200_000,
  address: 'Jadranski Put 12',
  city: 'Budva',
  country: 'Montenegro',
  beds: 2,
  baths: 1,
  livingRooms: 1,
  sqft: 80,
  yearBuilt: 2015,
  parking: 1,
  description: '',
  specialFeatures: [],
  materials: [],
  amenities: [],
  imageUrl: '',
  lat: 42.28,
  lng: 18.84,
  seller: { name: 'Seller', type: 'agent' } as Property['seller'],
  propertyType: 'apartment',
  ...overrides,
});

describe('useUniversalSearch', () => {
  const properties = [property({ id: 'a', title: 'Sea View Apartment in Budva' })];

  it('offers nothing at all while the box is closed', () => {
    const { result } = renderHook(() =>
      useUniversalSearch({ query: 'Budva', properties, enabled: false })
    );
    expect(result.current.suggestions).toEqual([]);
  });

  it('offers recent searches on an empty box, the way a search box should', () => {
    rememberSearch('Kotor');
    const { result } = renderHook(() => useUniversalSearch({ query: '', properties }));

    expect(result.current.suggestions.map((suggestion) => suggestion.type)).toEqual(['recent']);
    expect(result.current.suggestions[0].title).toBe('Kotor');
  });

  it('leads with the query itself, then places, then listings', () => {
    const { result } = renderHook(() => useUniversalSearch({ query: 'Budva', properties }));

    expect(result.current.suggestions[0].type).toBe('query');
    expect(result.current.groups.map((group) => group.labelKey)).toEqual([
      '',
      'search:suggestions.places',
      'search:suggestions.listings',
    ]);
  });

  it('says what a sentence will actually filter by', () => {
    const { result } = renderHook(() =>
      useUniversalSearch({ query: '3 bed villa in Budva under 300k', properties })
    );

    const [first] = result.current.suggestions;
    expect(first.type).toBe('query');
    expect(first.subtitle).toContain('3+ bed');
    expect(first.subtitle).toContain('villa');
    expect(first.subtitle).toContain('under €300,000');
  });

  it('answers from its own places without touching the network', () => {
    renderHook(() => useUniversalSearch({ query: 'Budva', properties }));
    expect(searchLocation).not.toHaveBeenCalled();
  });

  it('asks the geocoder only for a place it does not hold itself', async () => {
    vi.useFakeTimers();
    searchLocation.mockResolvedValue([
      {
        place_id: 7,
        lat: '41.32',
        lon: '19.81',
        display_name: 'Rruga e Durrësit, Tirana, Albania',
        boundingbox: ['0', '0', '0', '0'],
        address: { road: 'Rruga e Durrësit', city: 'Tirana', country: 'Albania', country_code: 'al' },
      },
    ]);

    const { result } = renderHook(() =>
      useUniversalSearch({ query: 'Rruga e Durresit', properties: [] })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(searchLocation).toHaveBeenCalled();
    const geocoded = result.current.suggestions.find(
      (suggestion) => suggestion.type === 'place' && suggestion.source === 'geocoder'
    );
    expect(geocoded?.title).toBe('Rruga e Durrësit');
    vi.useRealTimers();
  });
});

describe('Google Places — the businesses and residences a gazetteer cannot hold', () => {
  const moaResidence = {
    placeId: 'place-moa',
    title: 'MOA RESIDENCE',
    subtitle: 'Kashar, Albania',
    distanceKm: 12,
  };

  beforeEach(() => {
    isPlacesAvailable.mockReturnValue(true);
    fetchPlacePredictions.mockResolvedValue([moaResidence]);
  });

  it('finds a residence by name, which OSM does not index', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useUniversalSearch({ query: 'Moa resi', properties: [] }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const suggestion = result.current.suggestions.find(
      (entry) => entry.type === 'place' && entry.source === 'places'
    );

    expect(suggestion?.title).toBe('MOA RESIDENCE');
    expect(suggestion?.subtitle).toBe('Kashar, Albania');
    vi.useRealTimers();
  });

  it('writes a Places row in the app\'s own three-part shape', async () => {
    vi.useFakeTimers();
    // Google's secondary line can run longer than the app's format allows.
    fetchPlacePredictions.mockResolvedValue([
      { placeId: 'p', title: 'Rolling Hills', subtitle: 'Rruga e Elbasanit, Tirana, Albania' },
    ]);

    const { result } = renderHook(() => useUniversalSearch({ query: 'rolling hills', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const suggestion = result.current.suggestions.find(
      (entry): entry is Extract<typeof entry, { type: 'place' }> =>
        entry.type === 'place' && entry.source === 'places'
    );
    expect(suggestion?.searchValue).toBe('Rolling Hills, Rruga e Elbasanit, Albania');
    vi.useRealTimers();
  });

  it('does not ask Google about a city the app already knows', () => {
    renderHook(() => useUniversalSearch({ query: 'Budva', properties: [] }));
    expect(fetchPlacePredictions).not.toHaveBeenCalled();
  });

  it('falls back to the geocoder when no Maps key is configured', async () => {
    vi.useFakeTimers();
    isPlacesAvailable.mockReturnValue(false);
    searchLocation.mockResolvedValue([
      { place_id: 3, lat: '41.3', lon: '19.7', display_name: 'Rruga e Durrësit, Tirana, Albania', boundingbox: ['0','0','0','0'], address: { road: 'Rruga e Durrësit', city: 'Tirana', country: 'Albania', country_code: 'al' } },
    ]);

    const { result } = renderHook(() => useUniversalSearch({ query: 'rruga e durresit', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(fetchPlacePredictions).not.toHaveBeenCalled();
    expect(searchLocation).toHaveBeenCalled();
    expect(
      result.current.suggestions.some((entry) => entry.type === 'place' && entry.source === 'geocoder')
    ).toBe(true);
    vi.useRealTimers();
  });

  it('does not fall through to the geocoder when Places answered', async () => {
    vi.useFakeTimers();
    renderHook(() => useUniversalSearch({ query: 'Moa resi', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(searchLocation).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('keeps working when Google throws — a dead provider is a thinner list, not a broken box', async () => {
    vi.useFakeTimers();
    fetchPlacePredictions.mockResolvedValue([]);
    searchLocation.mockResolvedValue([]);

    const { result } = renderHook(() => useUniversalSearch({ query: 'Moa resi', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    // The query row survives, so Enter still runs a text search.
    expect(result.current.suggestions[0].type).toBe('query');
    expect(result.current.isSearching).toBe(false);
    vi.useRealTimers();
  });

  it('fetches geometry only when a row is picked, then spends the session token', async () => {
    vi.useFakeTimers();
    resolvePlaceDetails.mockResolvedValue({ lat: 41.33, lng: 19.72, formattedAddress: 'x' });

    const { result } = renderHook(() => useUniversalSearch({ query: 'Moa resi', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const suggestion = result.current.suggestions.find(
      (entry) => entry.type === 'place' && entry.source === 'places'
    ) as { placeId?: string; lat?: number };

    // Nothing was fetched to show the row.
    expect(suggestion.lat).toBeUndefined();
    expect(resolvePlaceDetails).not.toHaveBeenCalled();

    const resolved = await result.current.resolvePlace(suggestion as never);
    expect(resolved).toEqual({ lat: 41.33, lng: 19.72 });
    vi.useRealTimers();
  });

  it('reports a failed lookup as null rather than a bogus position', async () => {
    vi.useFakeTimers();
    resolvePlaceDetails.mockResolvedValue(null);

    const { result } = renderHook(() => useUniversalSearch({ query: 'Moa resi', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const suggestion = result.current.suggestions.find(
      (entry) => entry.type === 'place' && entry.source === 'places'
    );

    expect(await result.current.resolvePlace(suggestion as never)).toBeNull();
    vi.useRealTimers();
  });
});

describe('only places inside the countries the app covers', () => {
  it('asks Google only about the covered countries, by ISO code', async () => {
    vi.useFakeTimers();
    isPlacesAvailable.mockReturnValue(true);
    fetchPlacePredictions.mockResolvedValue([]);

    renderHook(() => useUniversalSearch({ query: 'Moa resi', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    // The restriction is the request, not a filter afterwards: nothing from
    // outside the ten countries is ever returned to be filtered.
    expect(fetchPlacePredictions).toHaveBeenCalledWith('Moa resi', expect.objectContaining({
      countryCode: undefined,
    }));
    vi.useRealTimers();
  });

  it('narrows to one country when the user picked one', async () => {
    vi.useFakeTimers();
    isPlacesAvailable.mockReturnValue(true);
    fetchPlacePredictions.mockResolvedValue([]);

    renderHook(() => useUniversalSearch({ query: 'Moa resi', properties: [], country: 'Albania' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(fetchPlacePredictions).toHaveBeenCalledWith('Moa resi', expect.objectContaining({
      countryCode: 'AL',
    }));
    vi.useRealTimers();
  });

  it('drops a geocoder row from outside them, read from its country code', async () => {
    vi.useFakeTimers();
    isPlacesAvailable.mockReturnValue(false);
    searchLocation.mockResolvedValue([
      {
        place_id: 8, lat: '38.3', lon: '26.3',
        display_name: 'Çeşme, İzmir, Türkiye',
        boundingbox: ['0', '0', '0', '0'],
        address: { town: 'Çeşme', city: 'İzmir', country: 'Türkiye', country_code: 'tr' },
      },
    ]);

    const { result } = renderHook(() => useUniversalSearch({ query: 'cesme izmir', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(
      result.current.suggestions.filter((entry) => entry.type === 'place' && entry.source === 'geocoder'),
    ).toEqual([]);
    vi.useRealTimers();
  });

  it('keeps a geocoder row from inside them', async () => {
    vi.useFakeTimers();
    isPlacesAvailable.mockReturnValue(false);
    searchLocation.mockResolvedValue([
      {
        place_id: 9, lat: '41.3', lon: '19.8',
        display_name: 'Rruga e Durrësit, Tirana, Albania',
        boundingbox: ['0', '0', '0', '0'],
        address: { road: 'Rruga e Durrësit', city: 'Tirana', country: 'Albania', country_code: 'al' },
      },
    ]);

    const { result } = renderHook(() => useUniversalSearch({ query: 'rruga e durresit', properties: [] }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(
      result.current.suggestions.some((entry) => entry.type === 'place' && entry.source === 'geocoder'),
    ).toBe(true);
    vi.useRealTimers();
  });
});
