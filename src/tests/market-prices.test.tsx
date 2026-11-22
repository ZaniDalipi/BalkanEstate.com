/**
 * "Property prices in the Balkans" (/:lang/property-prices): the table people
 * and answer engines read, its crawler HTML, and the page's states.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { marketTranslator } from '@/functions/_market-i18n';
import { buildPricesPage, handlePricesRequest } from '@/functions/_market-prices';
import { isPriceTable } from '@/src/features/market-pages/utils/marketApiResult';
import { priceCell, priceDatasetJsonLd, priceHeadText } from '@/src/features/market-pages/utils/priceTableText';
import type { PriceFigures, PriceTable } from '@/src/features/market-pages/types';

const apiRequest = vi.fn();
const seo = vi.fn();
vi.mock('@/src/shared/api', () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));
vi.mock('@/src/features/market-pages/hooks/useMarketText', () => ({
  useMarketText: () => ({ t: marketTranslator('en'), lang: 'en' }),
}));
vi.mock('@/src/components/seo', () => ({ SEO: (props: Record<string, unknown>) => { seo(props); return null; } }));
vi.mock('@/components/shared/Footer', () => ({ default: () => <footer /> }));

import PriceTablePage from '@/src/features/market-pages/components/prices/PriceTablePage';

const figures = (overrides: Partial<PriceFigures> = {}): PriceFigures => ({
  listingCount: 0, pricedCount: 0, priceMedian: null, pricePerSqmMedian: null, pricePerSqmCount: 0, ...overrides,
});

const table: PriceTable = {
  generatedAt: '2026-11-22T10:00:00.000Z',
  minSample: 10,
  countries: [
    {
      slug: 'albania', name: 'Albania', code: 'AL',
      sale: figures({ listingCount: 420, pricedCount: 400, priceMedian: 118_000, pricePerSqmMedian: 1450, pricePerSqmCount: 380 }),
      rent: figures({ listingCount: 95, pricedCount: 90, priceMedian: 550, pricePerSqmMedian: 8.4, pricePerSqmCount: 80 }),
      cities: [{
        slug: 'tirana', name: 'Tirana',
        sale: figures({ listingCount: 300, pricedCount: 290, priceMedian: 130_000, pricePerSqmMedian: 1600, pricePerSqmCount: 280 }),
        rent: figures({ listingCount: 6, pricedCount: 6 }),
      }],
    },
    { slug: 'greece', name: 'Greece', code: 'GR', sale: figures(), rent: figures(), cities: [] },
  ],
};

describe('price table helpers', () => {
  const en = marketTranslator('en');

  it('shows "–" for figures too few listings back', () => {
    expect(priceCell(null, 'en')).toBe('–');
    expect(priceCell(1450, 'en')).toBe('€1,450');
    expect(priceCell(8.4, 'en')).toBe('€8.4');
  });

  it('dates the intro and describes the page', () => {
    const head = priceHeadText(en, 'en', table.generatedAt);
    expect(head.intro).toBe('Median asking prices and rents of the live listings on BalkanEstateAI, by country and city, as of November 22, 2026.');
    expect(head.description.length).toBeGreaterThan(150);
  });

  it('declares a Dataset with its CSV download and coverage', () => {
    const ld = priceDatasetJsonLd('me', table, priceHeadText(en, 'en', table.generatedAt));
    expect(ld['@type']).toBe('Dataset');
    expect(ld.url).toBe('https://balkanestateai.com/me/property-prices');
    expect(ld.inLanguage).toBe('sr-ME');
    expect(ld.distribution[0]).toEqual({ '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: 'https://balkanestateai.com/property-prices.csv' });
    expect(ld.spatialCoverage.map((c) => c.name)).toEqual(['Albania', 'Greece']);
  });

  it('accepts only a well-formed table from the API', () => {
    expect(isPriceTable(table)).toBe(true);
    expect(isPriceTable({ ...table, countries: [{ ...table.countries[0], sale: { listingCount: 'x' } }] })).toBe(false);
    expect(isPriceTable({ ...table, minSample: undefined })).toBe(false);
    expect(isPriceTable(null)).toBe(false);
  });
});

describe('price page for crawlers', () => {
  it('is real HTML tables with links, the method, the citation and the CSV', () => {
    const { head, body } = buildPricesPage(table, 'en');
    expect(head).toContain('<title>Property Prices in the Balkans – Price per m² by Country and City | BalkanEstateAI</title>');
    expect(head).toContain('"@type":"Dataset"');
    expect(head).toMatch(/<meta name="robots" content="index/);
    expect(body).toContain('<h1>Property prices in the Balkans</h1>');
    expect(body).toContain('<td>€1,450</td>');
    expect(body).toContain('href="https://balkanestateai.com/en/property-for-sale/albania/tirana">Tirana</a>');
    expect(body).toContain('Each figure is a median');
    expect(body).toContain('href="https://balkanestateai.com/property-prices.csv"');
  });

  it('is in the page language', () => {
    expect(buildPricesPage(table, 'sq').body).toContain('<h1>Çmimet e pronave në Ballkan</h1>');
  });

  it('is noindex while no place has enough listings for a figure', () => {
    const empty = { ...table, countries: [table.countries[1]] };
    expect(buildPricesPage(empty, 'en').head).toMatch(/<meta name="robots" content="noindex/);
  });

  describe('request', () => {
    const context = (ua: string) => ({
      request: new Request('https://balkanestateai.com/en/property-prices', { headers: { 'user-agent': ua } }),
      env: { ASSETS: { fetch: vi.fn(async () => new Response('<spa/>', { status: 200 })) } },
    });
    afterEach(() => vi.unstubAllGlobals());

    it('gives people the app without an API call, and crawlers the table', async () => {
      const fetchSpy = vi.fn(async () => new Response(JSON.stringify(table), { status: 200 }));
      vi.stubGlobal('fetch', fetchSpy);
      expect(await (await handlePricesRequest(context('Mozilla/5.0 (iPhone) Safari/604.1'), 'en')).text()).toBe('<spa/>');
      expect(fetchSpy).not.toHaveBeenCalled();
      const crawled = await handlePricesRequest(context('Mozilla/5.0 (compatible; Claude-SearchBot/1.0)'), 'en');
      expect(await crawled.text()).toContain('Property prices in the Balkans');
    });

    it('falls back to the app when the API fails', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 500 })));
      expect(await (await handlePricesRequest(context('Googlebot/2.1'), 'en')).text()).toBe('<spa/>');
    });
  });
});

describe('price page for visitors', () => {
  const renderPage = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
      <MemoryRouter><PriceTablePage /></MemoryRouter>
    </QueryClientProvider>,
  );
  beforeEach(() => { apiRequest.mockReset(); seo.mockReset(); });

  it('shows each country\'s table with links, "–" for thin figures, the method and the CSV', async () => {
    apiRequest.mockResolvedValue(table);
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Property prices in the Balkans' })).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith('/market-prices');

    const albania = screen.getByRole('region', { name: 'Albania' });
    const tirana = within(albania).getByRole('row', { name: /Tirana/ });
    expect(within(tirana).getByText('€1,600')).toBeInTheDocument();
    expect(within(tirana).getAllByText('–').length).toBe(2);
    expect(within(albania).getByRole('link', { name: 'Tirana' })).toHaveAttribute('href', expect.stringContaining('/property-for-sale/albania/tirana'));

    expect(screen.getByRole('heading', { name: 'How the figures are calculated' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download the table (CSV)' })).toHaveAttribute('href', 'https://balkanestateai.com/property-prices.csv');
    expect(seo.mock.calls.at(-1)?.[0]).toMatchObject({ canonical: '/property-prices', noindex: false });
  });

  it('offers a retry and the map when the table cannot be loaded', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('Bad request'), { statusCode: 400 }));
    apiRequest.mockResolvedValueOnce(table);
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByRole('link', { name: 'Search the map' })).toBeInTheDocument();
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Property prices in the Balkans' })).toBeInTheDocument();
  });
});
