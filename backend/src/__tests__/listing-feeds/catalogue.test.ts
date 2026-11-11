process.env.SKIP_TEST_DB = 'true';

jest.mock('../../services/listingAdapters/httpClient', () => ({ httpGet: jest.fn() }));
jest.mock('../../services/listingAdapters/sitemap', () => ({ discoverSitemapUrls: jest.fn() }));

import * as cheerio from 'cheerio';
import { httpGet } from '../../services/listingAdapters/httpClient';
import { discoverSitemapUrls } from '../../services/listingAdapters/sitemap';
import { HtmlScrapeAdapter } from '../../services/listingAdapters/HtmlScrapeAdapter';
import { planCatalogue } from '../../services/listingAdapters/htmlScrape/detectCatalogue';
import {
  findIndexPageUrls, isBotChallengePage, looksLikeIndexPath, parseListingTotal,
} from '../../services/listingAdapters/htmlScrape/indexPages';
import type { IListingSource } from '../../models/ListingSource';

const HOME = 'https://agency.example/en/';
const homepage = `<nav>
  <a href="/en/properties/sale/">For sale</a><a href="/en/properties/rent/">For rent</a>
  <a href="/en/properties/vacation/">Holiday homes</a><a href="/en/properties/sold/">Sold</a>
  <a href="/en/properties/kosovo/sale/">Kosovo</a><a href="/en/contact/">Contact</a>
</nav>
<div class="featured">${[1, 2, 3].map((n) => `<article class="property-card"><a href="/en/properties/Vlore-ALVS${n}00/"><h3>Flat ${n}</h3></a><span class="price">€ 10${n}K</span></article>`).join('')}</div>`;
const CHALLENGE = '<html><head><title>One moment, please...</title></head><body><script>/* bot check */</script></body></html>';

describe('catalogue pages', () => {
  it('tells catalogue paths from listing paths', () => {
    expect(looksLikeIndexPath('/en/properties/sale/')).toBe(true);
    expect(looksLikeIndexPath('/nekretnine/prodaja/stanovi')).toBe(true);
    expect(looksLikeIndexPath('/en/properties/Vlore-ALVS1455/')).toBe(false);
    expect(looksLikeIndexPath('/listing-preview/banjole-kuca')).toBe(false);
  });

  it('finds the sale and rent catalogues on a homepage, best first, without sold ones', () => {
    expect(findIndexPageUrls(cheerio.load(homepage), HOME)).toEqual([
      'https://agency.example/en/properties/sale/',
      'https://agency.example/en/properties/kosovo/sale/',
      'https://agency.example/en/properties/rent/',
    ]);
  });

  it('recognises bot-check pages and announced totals', () => {
    expect(isBotChallengePage(CHALLENGE)).toBe(true);
    expect(isBotChallengePage(homepage)).toBe(false);
    expect(parseListingTotal('SHOWING 1–9 OF 526')).toBe(526);
    expect(parseListingTotal('Prikazano 1-24 od 1.312 oglasa')).toBe(1312);
    expect(parseListingTotal('Since 2007 properties sold')).toBeUndefined();
  });
});

describe('planCatalogue', () => {
  const countCards = (html: string) => (html.match(/property-card/g) ?? []).length;

  it('moves from a homepage to its catalogue pages', async () => {
    const catalogue = `<p>Showing 1–9 of 526</p>${homepage}`;
    const plan = await planCatalogue(homepage, HOME, { fetchPage: async () => catalogue, countCards });
    expect(plan).toMatchObject({ kind: 'indexPages', total: 526 });
    expect(plan.kind === 'indexPages' && plan.indexUrls[0]).toBe('https://agency.example/en/properties/sale/');
  });

  it('uses the sitemap when the catalogue is behind a bot check', async () => {
    await expect(planCatalogue(homepage, HOME, { fetchPage: async () => CHALLENGE, countCards }))
      .resolves.toEqual({ kind: 'sitemap', reason: 'bot-check' });
  });

  it('keeps a pasted catalogue page as it is', async () => {
    await expect(planCatalogue(homepage, 'https://agency.example/en/properties/sale/', { fetchPage: jest.fn(), countCards }))
      .resolves.toEqual({ kind: 'asPasted' });
  });
});

describe('HtmlScrapeAdapter with several catalogues', () => {
  const page = (prefix: string, n: number) =>
    `<div class="card"><a href="/listing/${prefix}-${n}"><h3>${prefix} ${n}</h3></a><span>€ 100.000</span><p>Pula</p></div>`;
  const source = (indexUrls: string[]) => ({
    slug: 's', acceptedTermsAt: new Date(),
    adapterConfig: { indexUrl: indexUrls[0], indexUrls: indexUrls.slice(1), selectors: { listingItem: 'div.card', link: 'a|attr:href', title: 'h3' }, maxPages: 5 },
  } as unknown as IListingSource);

  it('crawls the sale and the rent catalogue', async () => {
    (httpGet as jest.Mock).mockImplementation(async (url: string) => {
      const u = new URL(url);
      const kind = u.pathname.includes('rent') ? 'rent' : 'sale';
      const p = Number(u.searchParams.get('page') ?? '1');
      if (p > 2) return { data: '<p>nothing</p>' };
      return { data: [1, 2].map((i) => page(kind, (p - 1) * 2 + i)).join('') + (p < 2 ? `<a rel="next" href="?page=${p + 1}">next</a>` : '') };
    });
    const raws = await new HtmlScrapeAdapter().fetchListings(source(['https://a.example/sale/', 'https://a.example/rent/']));
    expect(raws.map((r) => r.raw.title)).toEqual(['sale 1', 'sale 2', 'sale 3', 'sale 4', 'rent 1', 'rent 2', 'rent 3', 'rent 4']);
  });

  it("falls back to the site's sitemap when the catalogue shows a bot check", async () => {
    (httpGet as jest.Mock).mockResolvedValue({ data: CHALLENGE });
    (discoverSitemapUrls as jest.Mock).mockResolvedValue({ urls: ['https://a.example/listing/1', 'https://a.example/listing/2'], source: 'x' });
    const raws = await new HtmlScrapeAdapter().fetchListings(source(['https://a.example/sale/']));
    expect(raws.map((r) => r.url)).toEqual(['https://a.example/listing/1', 'https://a.example/listing/2']);
  });

  it('says why when there is no sitemap either', async () => {
    (httpGet as jest.Mock).mockResolvedValue({ data: CHALLENGE });
    (discoverSitemapUrls as jest.Mock).mockResolvedValue(null);
    await expect(new HtmlScrapeAdapter().fetchListings(source(['https://a.example/sale/']))).rejects.toThrow(/bot check/);
  });
});
