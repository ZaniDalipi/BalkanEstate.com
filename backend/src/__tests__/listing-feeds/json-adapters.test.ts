process.env.SKIP_TEST_DB = 'true';

jest.mock('../../services/listingAdapters/httpClient', () => ({ httpGet: jest.fn() }));
jest.mock('../../services/listingAdapters/browserClient', () => ({ fetchWithBrowser: jest.fn() }));

import { httpGet } from '../../services/listingAdapters/httpClient';
import { JsonFeedAdapter } from '../../services/listingAdapters/JsonFeedAdapter';
import { CustomApiAdapter } from '../../services/listingAdapters/CustomApiAdapter';
import type { IListingSource } from '../../models/ListingSource';

const listing = (n: number) => ({ id: n, title: `Stan ${n}`, price: 100000 + n, city: 'Split', url: `https://site.example/oglas/${n}` });
const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => listing(from + i));
const asSource = (adapterType: string, adapterConfig: Record<string, unknown>) =>
  ({ slug: 't', adapterType, adapterConfig, fieldMap: {} } as unknown as IListingSource);
const mockGet = httpGet as jest.Mock;

describe('JsonFeedAdapter', () => {
  it('reads a page with embedded Next.js state, then every following page', async () => {
    mockGet.mockImplementation(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page') ?? '1');
      const results = page <= 3 ? range((page - 1) * 24 + 1, page === 3 ? 10 : 24) : [];
      const data = { props: { pageProps: { results } } };
      return { data: `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script></html>` };
    });
    const src = asSource('jsonFeed', { endpoint: 'https://site.example/prodaja', embeddedState: true, itemsPath: '$.results[*]', idPath: '$.id' });
    const raws = await new JsonFeedAdapter().fetchListings(src);
    expect(raws).toHaveLength(58);
  });

  it('still runs configs saved with `url` instead of `endpoint`, following the API next link', async () => {
    mockGet.mockImplementation(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page') ?? '1');
      return { data: { data: range((page - 1) * 2 + 1, 2), next: page < 3 ? `https://api.example/l?page=${page + 1}` : null } };
    });
    const src = asSource('jsonFeed', { url: 'https://api.example/l', itemsPath: '$.data[*]', idPath: '$.id' });
    const raws = await new JsonFeedAdapter().fetchListings(src);
    expect(raws.map((r) => r.id)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
});

describe('CustomApiAdapter', () => {
  it('pages through a WordPress REST endpoint until it answers 400', async () => {
    mockGet.mockImplementation(async (url: string) => {
      const u = new URL(url);
      expect(u.searchParams.get('per_page')).toBe('100');
      const page = Number(u.searchParams.get('page') ?? '1');
      if (page > 2) throw Object.assign(new Error('rest_post_invalid_page_number'), { response: { status: 400 } });
      return { data: range((page - 1) * 100 + 1, 100) };
    });
    const src = asSource('customApi', {
      url: 'https://site.example/wp-json/wp/v2/property',
      params: { per_page: 100 },
      pagination: { type: 'page', pageParam: 'page', maxPages: 100 },
      itemsPath: '$[*]',
      idPath: '$.id',
    });
    const raws = await new CustomApiAdapter().fetchListings(src);
    expect(raws).toHaveLength(200);
  });
});
