/**
 * Market landing pages for crawlers (functions/_market-pages.ts): the page a
 * search engine or AI crawler reads for /:lang/property-for-sale/… — heading,
 * figures, listings and links in the page's language, indexable only with
 * enough of our own listings, and a 404 that offers the next best page.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildMarketHubPage,
  buildMarketPlacePage,
  handleMarketRequest,
  marketNotFoundPage,
} from '@/functions/_market-pages';
import { marketTranslator } from '@/functions/_market-i18n';
import type { MarketHub, MarketPageData } from '@/src/features/market-pages/types';

const stats = {
  listingCount: 42,
  indexableCount: 30,
  pricedCount: 40,
  priceLow: 65_000,
  priceMedian: 120_000,
  priceHigh: 250_000,
  pricePerSqmMedian: 1450,
  pricePerSqmCount: 38,
  typeCounts: [{ type: 'apartment', count: 30 }, { type: 'land', count: 12 }],
};

const cityPage = (overrides: Partial<MarketPageData> = {}): MarketPageData => ({
  deal: 'sale',
  country: { slug: 'albania', name: 'Albania', code: 'AL' },
  city: { slug: 'tirana', name: 'Tirana' },
  stats,
  indexable: true,
  cities: [{ slug: 'durres', name: 'Durrës', count: 12, indexableCount: 9, indexable: true }],
  listings: [
    { id: 'Enc0dedId123', title: 'Sunny flat <b>near</b> Skanderbeg Square', price: 125_000, sqft: 85, city: 'Tirana', images: [{ url: '/images/flat.jpg' }] },
    { id: 'Enc0dedId456', title: 'Plot in Farka', price: 90_000, isNegotiable: true, city: 'Tirana' },
  ],
  generatedAt: '2026-11-22T10:00:00.000Z',
  ...overrides,
});

const meta = (head: string, name: string): string | null =>
  head.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] ?? null;

const jsonLd = (head: string): Array<Record<string, unknown>> =>
  [...head.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

describe('market page translator', () => {
  it('reads the locale files, interpolates, and falls back to English', () => {
    expect(marketTranslator('en')('marketPages:heading.sale', { place: 'Tirana, Albania' })).toBe('Property for sale in Tirana, Albania');
    expect(marketTranslator('sq')('common:countries.albania')).toBe('Shqipëri');
    expect(marketTranslator('xx')('marketPages:stats.listings')).toBe('Live listings');
    expect(marketTranslator('en')('marketPages:nope', { defaultValue: 'Fallback {{n}}', n: 3 })).toBe('Fallback 3');
    expect(marketTranslator('en')('admin:secret', { defaultValue: 'x' })).toBe('x');
  });
});

describe('city page for crawlers', () => {
  it('has the heading, figures, listings and links a searcher looks for', () => {
    const { head, body } = buildMarketPlacePage(cityPage(), 'en');
    expect(head).toContain('<title>Property for Sale in Tirana, Albania – Prices and Listings | BalkanEstateAI</title>');
    expect(body).toContain('<h1>Property for sale in Tirana, Albania</h1>');
    expect(meta(head, 'description')).toContain('Live listings: 42 · Median asking price: €120,000 · Median price per m²: €1,450');
    expect(body).toContain('<dt>Typical price range</dt><dd>€65,000 – €250,000</dd>');
    expect(body).toContain('href="https://balkanestateai.com/en/property/Enc0dedId123"');
    expect(body).toContain('— €125,000 · 85 m² · Tirana');
    // "Price on request" is not shown as a price
    expect(body).not.toContain('€90,000');
    expect(body).toContain('href="https://balkanestateai.com/en/property-for-sale/albania/durres">Durrës</a> (12)');
    expect(body).toContain('href="https://balkanestateai.com/en/property-for-rent/albania/tirana"');
    expect(body).toContain('href="https://balkanestateai.com/en/guides/albania"');
    expect(body).toContain('href="https://balkanestateai.com/en/search?country=Albania&amp;city=Tirana"');
  });

  it('escapes listing text', () => {
    const { body, head } = buildMarketPlacePage(cityPage(), 'en');
    expect(body).not.toContain('<b>near</b>');
    expect(body).toContain('&lt;b&gt;near&lt;/b&gt;');
    expect(head).not.toContain('<b>');
  });

  it('is indexable with hreflang alternates, and canonical to itself', () => {
    const { head } = buildMarketPlacePage(cityPage(), 'sq');
    expect(meta(head, 'robots')).toMatch(/^index, follow/);
    expect(head).toContain('rel="canonical" href="https://balkanestateai.com/sq/property-for-sale/albania/tirana"');
    expect(head).toContain('hreflang="sr-ME" href="https://balkanestateai.com/me/property-for-sale/albania/tirana"');
    expect(head).toContain('hreflang="x-default" href="https://balkanestateai.com/en/property-for-sale/albania/tirana"');
  });

  it('is noindex without alternates when too few of our own listings back it', () => {
    const { head } = buildMarketPlacePage(cityPage({ indexable: false }), 'en');
    expect(meta(head, 'robots')).toMatch(/^noindex/);
    expect(head).not.toContain('hreflang=');
  });

  it('describes the listings and the trail in valid JSON-LD', () => {
    const blocks = jsonLd(buildMarketPlacePage(cityPage(), 'en').head);
    const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList') as { itemListElement: Array<{ name: string }> };
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual(['Home', 'For sale', 'Albania', 'Tirana']);
    const collection = blocks.find((b) => b['@type'] === 'CollectionPage') as { mainEntity: { numberOfItems: number; itemListElement: Array<{ url: string }> } };
    expect(collection.mainEntity.numberOfItems).toBe(42);
    expect(collection.mainEntity.itemListElement[0].url).toBe('https://balkanestateai.com/en/property/Enc0dedId123');
  });

  it('is written in the page language, with the dash form where place names would need a case ending', () => {
    const sr = buildMarketPlacePage(cityPage(), 'sr');
    expect(sr.body).toContain('<h1>Некретнине на продају – Tirana, Албанија</h1>');
    expect(sr.body).toContain('Медијална тражена цена');
    const el = buildMarketPlacePage(cityPage({ deal: 'rent' }), 'el');
    expect(el.body).toContain('<h1>Ακίνητα προς ενοικίαση – Tirana, Αλβανία</h1>');
  });

  it('says there are no listings yet instead of an empty list, and shows no price figures it does not have', () => {
    const empty = cityPage({
      listings: [],
      stats: { ...stats, listingCount: 0, indexableCount: 0, pricedCount: 0, priceLow: null, priceMedian: null, priceHigh: null, pricePerSqmMedian: null, typeCounts: [] },
      indexable: false,
    });
    const { body, head } = buildMarketPlacePage(empty, 'en');
    expect(body).toContain('No listings here yet');
    expect(body).not.toContain('Median asking price');
    expect(meta(head, 'description')).toContain('Live listings: 0');
  });
});

describe('overview page for crawlers', () => {
  const hub: MarketHub = {
    deal: 'rent',
    generatedAt: '2026-11-22T10:00:00.000Z',
    countries: [
      { slug: 'kosovo', name: 'Kosovo', code: 'XK', count: 3, indexableCount: 1, indexable: false, cities: [] },
      { slug: 'albania', name: 'Albania', code: 'AL', count: 80, indexableCount: 50, indexable: true, cities: [{ slug: 'tirana', name: 'Tirana', count: 60, indexableCount: 40, indexable: true }] },
    ],
  };

  it('lists the countries, busiest first, with their cities', () => {
    const { body, head } = buildMarketHubPage(hub, 'en');
    expect(body).toContain('<h1>Property for rent in the Balkans</h1>');
    expect(body.indexOf('/en/property-for-rent/albania"')).toBeLessThan(body.indexOf('/en/property-for-rent/kosovo"'));
    expect(body).toContain('href="https://balkanestateai.com/en/property-for-rent/albania/tirana">Tirana</a> (60)');
    expect(body).toContain('Listings: 80');
    expect(meta(head, 'robots')).toMatch(/^index/);
  });

  it('is noindex while no country has enough listings', () => {
    const quiet = { ...hub, countries: hub.countries.map((c) => ({ ...c, indexable: false })) };
    expect(meta(buildMarketHubPage(quiet, 'en').head, 'robots')).toMatch(/^noindex/);
  });
});

describe('not found', () => {
  it('offers the country page for a city with no listings', () => {
    const page = marketNotFoundPage('en', 'sale', 'albania');
    expect(page.status).toBe(404);
    expect(meta(page.head, 'robots')).toBe('noindex');
    expect(page.body).toContain('No listings in this city right now');
    expect(page.body).toContain('href="https://balkanestateai.com/en/property-for-sale/albania">Property in Albania</a>');
  });

  it('offers the overview for anything else', () => {
    const page = marketNotFoundPage('mk', 'rent', 'atlantis');
    expect(page.body).toContain('Оваа страница не постои');
    expect(page.body).toContain('href="https://balkanestateai.com/mk/property-for-rent"');
    expect(page.body).not.toContain('atlantis');
  });
});

describe('request handling', () => {
  const context = (ua: string) => ({
    request: new Request('https://balkanestateai.com/en/property-for-sale/albania/tirana', { headers: { 'user-agent': ua } }),
    env: { ASSETS: { fetch: vi.fn(async () => new Response('<spa/>', { status: 200 })) } },
  });
  const GPTBOT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)';

  afterEach(() => vi.unstubAllGlobals());

  it('people get the app, without an API call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await handleMarketRequest(context('Mozilla/5.0 (iPhone) Safari/604.1'), 'sale', 'en', ['albania', 'tirana']);
    expect(await res.text()).toBe('<spa/>');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('AI crawlers get the rendered page from the API', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(cityPage()), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await handleMarketRequest(context(GPTBOT), 'sale', 'en', ['Albania', 'Tirana']);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Property for sale in Tirana, Albania');
    expect(String((fetchSpy.mock.calls[0] as unknown[])[0])).toBe('https://api.balkanestateai.com/api/market-pages/sale/albania/tirana');
  });

  it('malformed URLs are a 404 without an API call', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    for (const segments of [['albania', 'tirana', 'extra'], ['../admin'], ['albania', '<script>']]) {
      const res = await handleMarketRequest(context(GPTBOT), 'sale', 'en', segments);
      expect(res.status).toBe(404);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a city the API does not know is a 404 that offers its country', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"unknown-city"}', { status: 404 })));
    const res = await handleMarketRequest(context(GPTBOT), 'sale', 'en', ['albania', 'atlantis']);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('/en/property-for-sale/albania"');
  });

  it('falls back to the app when the API is down, rather than caching an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const res = await handleMarketRequest(context(GPTBOT), 'sale', 'en', ['albania']);
    expect(await res.text()).toBe('<spa/>');
  });

  it('renders the overview for the bare deal path', async () => {
    const hub: MarketHub = { deal: 'sale', generatedAt: '2026-11-22T10:00:00.000Z', countries: [] };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(hub), { status: 200 })));
    const res = await handleMarketRequest(context(GPTBOT), 'sale', 'el', []);
    expect(await res.text()).toContain('Ακίνητα προς πώληση – Βαλκάνια');
  });
});
