/**
 * /:lang/property-for-sale[/:country[/:city]] for visitors: the page shows
 * the figures, listings and links; asks search engines to skip it when too
 * few of our own listings back it; and never leaves the visitor at a dead
 * end — an unknown city offers its country, a failed load offers a retry and
 * the map.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { marketTranslator } from '@/functions/_market-i18n';
import type { MarketHub, MarketPageData } from '@/src/features/market-pages/types';

const apiRequest = vi.fn();
const seo = vi.fn();

vi.mock('@/src/shared/api', () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock('@/src/features/market-pages/hooks/useMarketText', () => ({
  useMarketText: () => ({ t: marketTranslator('en'), lang: 'en' }),
}));
vi.mock('@/src/components/seo', () => ({
  SEO: (props: Record<string, unknown>) => {
    seo(props);
    return null;
  },
}));
vi.mock('@/src/app/router/routeElements', () => ({
  Redirect: ({ to }: { to: string }) => <p data-testid="redirect">{to}</p>,
}));
vi.mock('@/components/shared/Footer', () => ({ default: () => <footer /> }));
vi.mock('@/src/features/promo', () => ({ AdSlot: () => null }));
vi.mock('@/src/features/property-details/components/PropertyCard', () => ({
  default: ({ property }: { property: { title: string } }) => <article>{property.title}</article>,
}));

import MarketPage from '@/src/features/market-pages/components/MarketPage';

const stats = {
  listingCount: 42,
  indexableCount: 30,
  pricedCount: 40,
  priceLow: 65_000,
  priceMedian: 120_000,
  priceHigh: 250_000,
  pricePerSqmMedian: 1450,
  pricePerSqmCount: 38,
  typeCounts: [{ type: 'apartment', count: 30 }],
};

const tirana = (overrides: Partial<MarketPageData> = {}): MarketPageData => ({
  deal: 'sale',
  country: { slug: 'albania', name: 'Albania', code: 'AL' },
  city: { slug: 'tirana', name: 'Tirana' },
  stats,
  indexable: true,
  cities: [{ slug: 'durres', name: 'Durrës', count: 12, indexableCount: 9, indexable: true }],
  listings: [{ id: 'abc123', title: 'Flat near Skanderbeg Square', price: 125_000, createdAt: '2026-11-01', lastRenewed: '2026-11-01' }],
  generatedAt: '2026-11-22T10:00:00.000Z',
  ...overrides,
});

const renderAt = (url: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/:lang/property-for-sale" element={<MarketPage deal="sale" />} />
          <Route path="/:lang/property-for-sale/:country" element={<MarketPage deal="sale" />} />
          <Route path="/:lang/property-for-sale/:country/:city" element={<MarketPage deal="sale" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const lastSeo = () => seo.mock.calls.at(-1)?.[0] as Record<string, unknown>;

beforeEach(() => {
  apiRequest.mockReset();
  seo.mockReset();
});

describe('market landing page', () => {
  it('shows the heading, figures, listings and the way to the map and other cities', async () => {
    apiRequest.mockResolvedValue(tirana());
    renderAt('/en/property-for-sale/albania/tirana');

    expect(await screen.findByRole('heading', { level: 1, name: 'Property for sale in Tirana, Albania' })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/market-pages/sale/albania/tirana');
    expect(screen.getByText('Median asking price').nextSibling).toHaveTextContent('€120,000');
    expect(screen.getByText('Flat near Skanderbeg Square')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See every property for sale in Tirana, Albania on the map/ })).toHaveAttribute(
      'href',
      expect.stringContaining('/search?country=Albania&city=Tirana'),
    );
    const others = screen.getByRole('region', { name: 'Other cities in Albania' });
    expect(within(others).getByRole('link', { name: /Durrës/ })).toHaveAttribute('href', expect.stringContaining('/property-for-sale/albania/durres'));

    const sw = screen.getByRole('navigation', { name: 'Sale or rent' });
    expect(within(sw).getByRole('link', { name: 'For sale' })).toHaveAttribute('aria-current', 'page');
    expect(within(sw).getByRole('link', { name: 'For rent' })).toHaveAttribute('href', expect.stringContaining('/property-for-rent/albania/tirana'));

    expect(lastSeo()).toMatchObject({
      title: 'Property for Sale in Tirana, Albania – Prices and Listings',
      canonical: '/property-for-sale/albania/tirana',
      noindex: false,
    });
  });

  it('asks search engines to skip a page with too few of our own listings', async () => {
    apiRequest.mockResolvedValue(tirana({ indexable: false }));
    renderAt('/en/property-for-sale/albania/tirana');
    await screen.findByRole('heading', { level: 1 });
    expect(lastSeo()).toMatchObject({ noindex: true });
  });

  it('offers the country when the city has no listings', async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error('No listings in this city right now'), {
      statusCode: 404,
      details: { error: 'unknown-city', country: { slug: 'albania', name: 'Albania', code: 'AL' } },
    }));
    renderAt('/en/property-for-sale/albania/atlantis');
    expect(await screen.findByRole('heading', { name: 'No listings in this city right now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Property in Albania' })).toHaveAttribute('href', expect.stringContaining('/property-for-sale/albania'));
    expect(lastSeo()).toMatchObject({ noindex: true });
  });

  it('explains a failed load after its automatic retries, and loads again on "Try again"', async () => {
    const serverError = () => Object.assign(new Error('Server error'), { statusCode: 500 });
    // The first load and its two automatic retries fail; the visitor's retry succeeds.
    apiRequest
      .mockRejectedValueOnce(serverError())
      .mockRejectedValueOnce(serverError())
      .mockRejectedValueOnce(serverError())
      .mockResolvedValueOnce(tirana());
    renderAt('/en/property-for-sale/albania/tirana');

    const alert = await screen.findByRole('alert', {}, { timeout: 6000 });
    expect(apiRequest).toHaveBeenCalledTimes(3);
    expect(alert).toHaveTextContent('This page could not be loaded');
    expect(within(alert).getByRole('link', { name: 'Search the map' })).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Property for sale in Tirana, Albania' })).toBeInTheDocument();
  }, 10_000);

  it('says a malformed address does not exist, without asking the API', async () => {
    renderAt('/en/property-for-sale/albania/ti%20rana');
    expect(await screen.findByRole('heading', { name: 'This page does not exist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Property for sale in the Balkans' })).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('moves a mixed-case address to the lower-case one', () => {
    renderAt('/en/property-for-sale/Albania/Tirana');
    expect(screen.getByTestId('redirect')).toHaveTextContent('/property-for-sale/albania/tirana');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('lists every country on the overview, busiest first', async () => {
    const hub: MarketHub = {
      deal: 'sale',
      generatedAt: '2026-11-22T10:00:00.000Z',
      countries: [
        { slug: 'kosovo', name: 'Kosovo', code: 'XK', count: 4, indexableCount: 4, indexable: false, cities: [] },
        { slug: 'albania', name: 'Albania', code: 'AL', count: 90, indexableCount: 60, indexable: true, cities: [{ slug: 'tirana', name: 'Tirana', count: 70, indexableCount: 50, indexable: true }] },
      ],
    };
    apiRequest.mockResolvedValue(hub);
    renderAt('/en/property-for-sale');

    expect(await screen.findByRole('heading', { level: 1, name: 'Property for sale in the Balkans' })).toBeInTheDocument();
    const countries = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(countries).toEqual(['Albania', 'Kosovo']);
    expect(screen.getByRole('link', { name: 'Tirana' })).toHaveAttribute('href', expect.stringContaining('/property-for-sale/albania/tirana'));
    expect(lastSeo()).toMatchObject({ canonical: '/property-for-sale', noindex: false });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/market-pages/sale'));
  });
});
