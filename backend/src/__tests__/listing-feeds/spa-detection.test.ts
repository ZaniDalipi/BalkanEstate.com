import { detectHtmlScrape, looksLikeListingPath } from '../../services/listingDetectorService';
import { detectRepeatedCards } from '../../services/listingAdapters/htmlScrape/detectRepeatedCards';
import { findListingApi } from '../../services/listingAdapters/browserApiSniff';

const PAGE = 'https://shop.example.app/product/list';

const card = (i: number, href: string) => `
  <div class="product-box">
    <a href="${href}"><img src="/img/${i}.jpg" alt="" /></a>
    <h3>Apartment ${i} in Prishtina</h3>
    <span>${100000 + i * 5000} €</span>
  </div>`;

const grid = (hrefs: string[]) =>
  `<html><body><nav><a href="/">Home</a></nav><main><div class="grid">${hrefs.map((h, i) => card(i, h)).join('')}</div></main></body></html>`;

describe('looksLikeListingPath', () => {
  it.each([
    '/product/abc',
    '/products/12',
    '/en/item/x',
    '/view/65f1c2a9e4b0a1b2c3d4e5f6',
    '/p/3f2b8c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
  ])('accepts %s', (path) => expect(looksLikeListingPath(path)).toBe(true));

  it.each(['/about', '/login', '/contact'])('still rejects %s', (path) =>
    expect(looksLikeListingPath(path)).toBe(false));
});

describe('detectRepeatedCards', () => {
  it('finds cards whose links do not look like listings', () => {
    const html = grid(['/x/aa', '/x/bb', '/x/cc', '/x/dd']);
    expect(detectRepeatedCards(html, PAGE)).toEqual({ selector: 'div.product-box', count: 4 });
  });

  it('ignores repeated blocks that carry no price or property spec', () => {
    const blog = Array.from({ length: 5 }, (_, i) =>
      `<div class="post"><a href="/blog/${i}">Read our news ${i}</a><p>Company update</p></div>`).join('');
    expect(detectRepeatedCards(`<html><body><main>${blog}</main></body></html>`, PAGE)).toBeNull();
  });

  it('ignores fewer than three cards', () => {
    expect(detectRepeatedCards(grid(['/x/aa', '/x/bb']), PAGE)).toBeNull();
  });
});

describe('detectHtmlScrape fallback', () => {
  it('reads title, price and link from cards found by layout', () => {
    const result = detectHtmlScrape(grid(['/q/aa', '/q/bb', '/q/cc']), PAGE);
    expect(result?.selectors.listingItem).toBe('div.product-box');
    expect(result?.sample.url).toBe('https://shop.example.app/q/aa');
    expect(result?.sample.title).toContain('Apartment 0');
    expect(result?.sample.price).toContain('€');
  });
});

describe('findListingApi', () => {
  const items = [1, 2, 3].map((i) => ({ id: i, title: `Flat ${i}`, price: 90000 + i, city: 'Prishtina' }));

  it('picks the response that holds the listings', () => {
    const api = findListingApi([
      { url: 'https://api.example.app/config', data: { theme: 'light' } },
      { url: 'https://api.example.app/products?page=1', data: { data: { rows: items } } },
    ]);
    expect(api?.endpoint).toBe('https://api.example.app/products?page=1');
    expect(api?.itemsPath).toBe('$.data.rows[*]');
    expect(api?.items).toHaveLength(3);
  });

  it('skips trackers even when they look like lists', () => {
    expect(findListingApi([{ url: 'https://www.google-analytics.com/collect', data: items }])).toBeNull();
  });

  it('returns null when nothing holds listings', () => {
    expect(findListingApi([{ url: 'https://api.example.app/me', data: { name: 'x' } }])).toBeNull();
  });
});
