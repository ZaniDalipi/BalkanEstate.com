/**
 * /explore-cities page wiring.
 *
 * The card grid moved into `CityMarketCard` and gained a tab bar, so this
 * covers the seam: both tabs render, switching works, and a follow on a card
 * reaches the saved-cities endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CityMarketData } from '@/services/apiService';

const apiRequest = vi.fn();
const getFeaturedCities = vi.fn();
const appState = { isAuthenticated: true, currentUser: { id: 'u1', name: 'Ana' } };

vi.mock('@/src/shared/api', () => ({
  apiRequest: (...args: unknown[]) => apiRequest(...args),
}));

vi.mock('@/services/apiService', () => ({
  getFeaturedCities: (...args: unknown[]) => getFeaturedCities(...args),
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({
    state: appState,
    dispatch: vi.fn(),
    updateSearchPageState: vi.fn(),
  }),
}));

vi.mock('@/services/osmService', () => ({ searchLocation: vi.fn().mockResolvedValue([]) }));
vi.mock('@/src/utils/languageRouting', () => ({ navigateWithLanguage: vi.fn() }));
vi.mock('@/components/shared/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/src/components/seo', () => ({ SEO: () => null }));
vi.mock('react-helmet-async', () => ({ Helmet: () => null }));
vi.mock('@/components/shared/ExploreCitiesHeroBanner', () => ({ default: () => <div data-testid="hero" /> }));
vi.mock('@/components/shared/Decorative3D', () => ({
  FloatingSphere: () => null,
  Decorative3DStyles: () => null,
  RandomCityBubbles: () => null,
}));
// The page merges a static fallback city list into the API response; this
// test is about the tab and follow wiring, so it renders only the mocked rows.
vi.mock('../features/cities/data/staticCities', () => ({
  mergeWithStaticFallback: (cities: unknown[]) => cities,
}));

vi.mock('@/config/imageConfig', () => ({
  getCityImageUrl: () => 'https://img.test/city.jpg',
  getCityFallbackGradient: () => 'linear-gradient(#fff,#000)',
}));

import CityRecommendations from '../features/cities/components/CityRecommendations';

const city = (overrides: Partial<CityMarketData> = {}): CityMarketData => ({
  _id: 'c1',
  city: 'Tirana',
  country: 'Albania',
  countryCode: 'AL',
  avgPricePerSqm: 2400,
  medianPrice: 168000,
  priceGrowthYoY: 9,
  priceGrowthMoM: 0.7,
  averageDaysOnMarket: 38,
  listingsCount: 120,
  soldLastMonth: 8,
  demandScore: 82,
  rentalYield: 5.4,
  investmentScore: 78,
  topNeighborhoods: ['Blloku'],
  marketTrend: 'rising',
  highlights: ['Strong demand'],
  lastUpdated: '2026-09-01T00:00:00.000Z',
  dataSource: 'gemini',
  featured: true,
  displayOrder: 0,
  ...overrides,
});

const renderPage = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={client}>
      <CityRecommendations />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2));
  return utils;
};

describe('Explore cities page', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    getFeaturedCities.mockReset();
    appState.isAuthenticated = true;
    appState.currentUser = { id: 'u1', name: 'Ana' };

    getFeaturedCities.mockResolvedValue([
      city(),
      city({ _id: 'c2', city: 'Belgrade', country: 'Serbia', countryCode: 'RS' }),
    ]);
    apiRequest.mockResolvedValue({ cities: [], count: 0, limit: 50 });
  });

  it('shows the city grid under an All cities / Saved places tab bar', async () => {
    await renderPage();

    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'explore-cities-panel-all');
    expect(screen.getByText('Tirana')).toBeInTheDocument();
    expect(screen.getByText('Belgrade')).toBeInTheDocument();
  });

  it('switches to the saved places panel', async () => {
    await renderPage();

    fireEvent.click(screen.getAllByRole('tab')[1]);

    await waitFor(() => {
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'explore-cities-panel-saved');
    });
    expect(screen.getByText('saved.emptyTitle')).toBeInTheDocument();
  });

  it('follows a city from its card and shows it in Saved places', async () => {
    // Start empty, then report Tirana as followed once the toggle has landed.
    let followed = false;
    apiRequest.mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === 'POST') {
        followed = true;
        return Promise.resolve({ saved: true, city: null });
      }
      return Promise.resolve({
        cities: followed
          ? [{ city: 'Tirana', country: 'Albania', countryCode: 'AL', savedAt: '2026-09-01' }]
          : [],
        count: followed ? 1 : 0,
        limit: 50,
      });
    });

    await renderPage();

    // The mocked translator drops interpolation, so both cards share a label —
    // the POST body below is what proves the right card was clicked.
    const followButtons = screen.getAllByRole('button', { name: 'saved.followCity' });
    expect(followButtons).toHaveLength(2);
    fireEvent.click(followButtons[0]);

    await waitFor(() => {
      const post = apiRequest.mock.calls.find(([, options]) => options?.method === 'POST');
      expect(post?.[0]).toBe('/saved-cities/toggle');
      expect(post?.[1].body).toEqual({ city: 'Tirana', country: 'Albania' });
    });

    // The tab badge reflects the follow once the list refetches.
    await waitFor(() => expect(screen.getAllByRole('tab')[1]).toHaveTextContent('1'));

    fireEvent.click(screen.getAllByRole('tab')[1]);
    await waitFor(() => expect(screen.getByText('saved.emailNotice')).toBeInTheDocument());
  });

  it('offers no follow control to a signed-out reader and never calls the endpoint', async () => {
    appState.isAuthenticated = false;
    appState.currentUser = null as never;

    await renderPage();

    expect(screen.getAllByRole('button', { name: 'saved.signInToSave' })).toHaveLength(2);
    expect(screen.queryAllByRole('button', { name: 'saved.followCity' })).toHaveLength(0);
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
