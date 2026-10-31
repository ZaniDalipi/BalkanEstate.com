process.env.SKIP_TEST_DB = 'true';

import { crawlIndexPages } from '../../services/listingAdapters/htmlScrape/crawlIndexPages';

const BASE = 'https://agency.example/nekretnine';
const PER_PAGE = 24;
const TOTAL = 61;

const card = (n: number) => `
  <div class="property-card">
    <a href="/nekretnina/stan-${n}-12${n}"><h3>Stan ${n}</h3></a>
    <span class="price">${100 + n}.000 €</span><span>${n % 4 + 1} sobe</span><span>${50 + n} m²</span>
  </div>`;

/** Listing index of a fake agency site; `pager` decides how page 2+ is reachable. */
const page = (n: number, pager: 'numbers' | 'none') => {
  const from = (n - 1) * PER_PAGE;
  const cards = Array.from({ length: Math.max(0, Math.min(PER_PAGE, TOTAL - from)) }, (_, i) => card(from + i + 1)).join('');
  const pages = Math.ceil(TOTAL / PER_PAGE);
  const nav = pager === 'numbers'
    ? `<nav class="pagination">${Array.from({ length: pages }, (_, i) => `<a href="${BASE}?strana=${i + 1}">${i + 1}</a>`).join('')}</nav>`
    : '<button class="load-more">Učitaj još</button>';
  return `<html><body><div class="results">${cards}</div>${nav}</body></html>`;
};

const selectors = { listingItem: 'div.property-card', link: 'a|attr:href', title: 'h3', price: '.price' };
const config = { indexUrl: BASE, selectors, followDetails: false, maxPages: 50, deadline: Date.now() + 60_000 };

describe('crawlIndexPages', () => {
  it('walks numbered pagination to collect every listing', async () => {
    const fetchHtml = jest.fn(async (url: string) => page(Number(new URL(url).searchParams.get('strana') ?? '1'), 'numbers'));
    const stubs = await crawlIndexPages(config, { fetchHtml });
    expect(stubs).toHaveLength(TOTAL);
    expect(stubs[TOTAL - 1].raw).toMatchObject({ title: `Stan ${TOTAL}` });
    expect(fetchHtml).toHaveBeenCalledTimes(3);
  });

  it('finds page 2+ on a "Load more" site by guessing the page parameter', async () => {
    // The server answers ?page=N even though the UI only has a button.
    const fetchHtml = jest.fn(async (url: string) => {
      const u = new URL(url);
      if (u.pathname !== '/nekretnine' || [...u.searchParams.keys()].some((k) => k !== 'page')) return page(1, 'none');
      return page(Number(u.searchParams.get('page') ?? '1'), 'none');
    });
    const stubs = await crawlIndexPages(config, { fetchHtml });
    expect(stubs).toHaveLength(TOTAL);
  });

  it('reads beds, area and price from each card', async () => {
    const fetchHtml = async () => page(1, 'none').replace(/<button[^>]*>.*?<\/button>/, '');
    const [first] = await crawlIndexPages({ ...config, maxPages: 1 }, { fetchHtml });
    expect(first.raw).toMatchObject({ beds: '2', sqft: '51', price: '101.000 €' });
  });
});
