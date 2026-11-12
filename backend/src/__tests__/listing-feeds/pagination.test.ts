process.env.SKIP_TEST_DB = 'true';

import * as cheerio from 'cheerio';
import { findNextPageUrl } from '../../services/listingAdapters/pagination/nextPageLink';
import { pageUrlFor, pageUrlPatterns } from '../../services/listingAdapters/pagination/pageUrlGuesses';
import { walkPages } from '../../services/listingAdapters/pagination/walkPages';
import { nextLinkInPayload } from '../../services/listingAdapters/jsonFeed/nextLinkInPayload';

const BASE = 'https://agency.example/nekretnine/';

describe('findNextPageUrl', () => {
  const next = (html: string, page = 1, url = BASE) => findNextPageUrl(cheerio.load(html), url, page);

  it('follows <link rel="next">', () => {
    expect(next('<head><link rel="next" href="?page=2"></head>')).toBe(`${BASE}?page=2`);
  });

  it('follows a "Sljedeća" button inside the pagination bar', () => {
    expect(next('<ul class="pagination"><li><a href="/n?str=1">1</a></li><li><a href="/n?str=2">Sljedeća</a></li></ul>'))
      .toBe('https://agency.example/n?str=2');
  });

  it('follows the numbered link of the next page when there is no "next" button', () => {
    const html = '<div class="paginator"><a href="/n/page/1">1</a><a href="/n/page/2">2</a><a href="/n/page/3">3</a></div>';
    expect(next(html, 2, 'https://agency.example/n/page/2')).toBe('https://agency.example/n/page/3');
  });

  it('returns undefined on the last page', () => {
    expect(next('<div class="pagination"><a href="/n?p=1">1</a><span>2</span></div>', 2)).toBeUndefined();
  });

  it('ignores a next link that points back at the same page', () => {
    expect(next(`<a rel="next" href="${BASE}">next</a>`)).toBeUndefined();
  });
});

describe('page URL patterns', () => {
  it('builds query, offset and path page URLs', () => {
    expect(pageUrlFor(BASE, { kind: 'query', param: 'page', base: 1 }, 3)).toBe(`${BASE}?page=3`);
    expect(pageUrlFor(BASE, { kind: 'offset', param: 'offset', perPage: 24 }, 3)).toBe(`${BASE}?offset=48`);
    expect(pageUrlFor(`${BASE}page/2/`, { kind: 'path', segment: 'page' }, 3)).toBe(`${BASE}page/3/`);
  });

  it('tries a page param the URL already carries first', () => {
    const [first] = pageUrlPatterns(`${BASE}?stranica=1&grad=split`, 24);
    expect(first).toEqual({ kind: 'query', param: 'stranica', base: 1 });
  });
});

/** A fake site: `total` listings, `perPage` per page, paged with ?page=N. */
const fakeSite = (total: number, perPage: number, withLinks: boolean) => {
  const requested: string[] = [];
  const load = async (url: string) => {
    requested.push(url);
    const u = new URL(url);
    if ([...u.searchParams.keys()].some((k) => k !== 'page')) return { items: firstPage() }; // unknown params ignored
    const page = Number(u.searchParams.get('page') ?? '1');
    const from = (page - 1) * perPage;
    const items = Array.from({ length: Math.max(0, Math.min(perPage, total - from)) }, (_, i) => `listing-${from + i + 1}`);
    const nextUrl = withLinks && from + perPage < total ? `${BASE}?page=${page + 1}` : undefined;
    return { items, nextUrl };
  };
  const firstPage = () => Array.from({ length: Math.min(perPage, total) }, (_, i) => `listing-${i + 1}`);
  return { load, requested };
};

describe('walkPages', () => {
  it('collects every page, not just the first 24', async () => {
    const site = fakeSite(100, 24, true);
    const items = await walkPages({ firstUrl: BASE, maxPages: 50, load: site.load, keyOf: (x: string) => x });
    expect(items).toHaveLength(100);
    expect(items[99]).toBe('listing-100');
  });

  it('guesses ?page=N when the site has only a "Load more" button', async () => {
    const site = fakeSite(60, 24, false);
    const items = await walkPages({ firstUrl: BASE, maxPages: 50, load: site.load, keyOf: (x: string) => x });
    expect(items).toHaveLength(60);
  });

  it('does not guess when told not to (single-file feeds)', async () => {
    const site = fakeSite(60, 24, false);
    const items = await walkPages({ firstUrl: BASE, maxPages: 50, guessPattern: false, load: site.load, keyOf: (x: string) => x });
    expect(items).toHaveLength(24);
    expect(site.requested).toHaveLength(1);
  });

  it('stops when a page only repeats what was seen (sites that ignore the page param)', async () => {
    const load = jest.fn(async () => ({ items: ['a', 'b', 'c'] }));
    const items = await walkPages({ firstUrl: BASE, maxPages: 50, load, keyOf: (x: string) => x });
    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('ends quietly when a page past the last one errors, but fails if page 1 does', async () => {
    const load = jest.fn(async (url: string) => {
      if (url.includes('page=3')) throw new Error('400');
      const page = Number(new URL(url).searchParams.get('page') ?? '1');
      return { items: [`p${page}`] };
    });
    const pattern = { kind: 'query' as const, param: 'page', base: 1 as const };
    await expect(walkPages({ firstUrl: BASE, pattern, maxPages: 10, load, keyOf: (x: string) => x })).resolves.toEqual(['p1', 'p2']);
    const failing = jest.fn(async () => { throw new Error('403'); });
    await expect(walkPages({ firstUrl: BASE, maxPages: 10, load: failing, keyOf: (x: string) => x })).rejects.toThrow('403');
  });

  it('respects the limit', async () => {
    const site = fakeSite(100, 24, true);
    const items = await walkPages({ firstUrl: BASE, maxPages: 50, limit: 30, load: site.load, keyOf: (x: string) => x });
    expect(items).toHaveLength(30);
  });
});

describe('nextLinkInPayload', () => {
  it.each([
    [{ next: 'https://api.example/l?page=2' }, 'https://api.example/l?page=2'],
    [{ links: { next: '/l?page=2' } }, 'https://api.example/l?page=2'],
    [{ _links: { next: { href: '/l?cursor=x' } } }, 'https://api.example/l?cursor=x'],
    [{ next_page_url: null }, undefined],
    [{ next: true }, undefined],
  ])('%j → %s', (payload, expected) => {
    expect(nextLinkInPayload(payload, 'https://api.example/l')).toBe(expected);
  });
});
