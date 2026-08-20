/**
 * Regression tests for listing-source adapter configuration handling.
 *
 * The auto-detector used to persist `url`/`params` while the adapters read
 * `endpoint`/`query`, so every source created from detection blew up on the
 * first preview with "CustomApiAdapter: endpoint, itemsPath and idPath
 * required" (HTTP 500). These tests pin both halves of the fix:
 *   1. adapters accept the legacy key names, so already-saved sources work;
 *   2. missing config raises a user-fixable `ListingSourceConfigError`.
 */

import { CustomApiAdapter } from '../services/listingAdapters/CustomApiAdapter';
import { JsonFeedAdapter } from '../services/listingAdapters/JsonFeedAdapter';
import {
  ListingSourceConfigError,
  resolveEndpoint,
  resolveItemId,
  resolveQueryParams,
} from '../services/listingAdapters/configUtils';
import type { IListingSource } from '../models/ListingSource';

jest.mock('../services/listingAdapters/httpClient', () => ({
  httpGet: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { httpGet } = require('../services/listingAdapters/httpClient') as {
  httpGet: jest.Mock;
};

const makeSource = (overrides: Partial<IListingSource> = {}): IListingSource =>
  ({
    name: 'Test Agency',
    slug: 'user-abc123-1700000000000',
    baseUrl: 'https://example.com/',
    adapterType: 'customApi',
    adapterConfig: {},
    fieldMap: {},
    ...overrides,
  } as unknown as IListingSource);

const LISTINGS = [
  { id: 'a-1', title: 'Two-bedroom apartment', price: 145000, city: 'Zagreb', url: 'https://example.com/1' },
  { id: 'a-2', title: 'Seaside villa', price: 480000, city: 'Split', url: 'https://example.com/2' },
];

describe('adapter config resolution', () => {
  describe('resolveEndpoint', () => {
    it('prefers the canonical `endpoint` key', () => {
      expect(resolveEndpoint({ endpoint: 'https://a.test', url: 'https://b.test' })).toBe('https://a.test');
    });

    it('accepts the legacy `url` and `apiUrl` keys', () => {
      expect(resolveEndpoint({ url: 'https://b.test' })).toBe('https://b.test');
      expect(resolveEndpoint({ apiUrl: 'https://c.test' })).toBe('https://c.test');
    });

    it('ignores blank values', () => {
      expect(resolveEndpoint({ endpoint: '   ', url: 'https://d.test' })).toBe('https://d.test');
      expect(resolveEndpoint({})).toBeUndefined();
    });
  });

  describe('resolveQueryParams', () => {
    it('reads the legacy `params` key and stringifies values', () => {
      expect(resolveQueryParams({ params: { per_page: 20, _embed: true } })).toEqual({
        per_page: '20',
        _embed: 'true',
      });
    });

    it('returns undefined when no params are configured', () => {
      expect(resolveQueryParams({})).toBeUndefined();
      expect(resolveQueryParams({ query: {} })).toBeUndefined();
    });
  });

  describe('resolveItemId', () => {
    it('uses the configured JSONPath when it resolves', () => {
      expect(resolveItemId({ id: 'x9' }, '$.id', 0)).toBe('x9');
    });

    it('falls back to common id keys when the path misses', () => {
      expect(resolveItemId({ listing_id: 42 }, '$.id', 0)).toBe('42');
    });

    it('unwraps Mongo extended JSON ids', () => {
      expect(resolveItemId({ _id: { $oid: 'abc' } }, '$.id', 0)).toBe('abc');
    });

    it('is deterministic for items with no id at all', () => {
      const item = { title: 'No id here', price: 100 };
      expect(resolveItemId(item, '$.id', 0)).toBe(resolveItemId({ ...item }, '$.id', 7));
    });
  });
});

describe('CustomApiAdapter', () => {
  beforeEach(() => httpGet.mockReset());

  it('fetches when the config uses the legacy `url` key', async () => {
    httpGet.mockResolvedValue({ data: { data: LISTINGS } });

    const source = makeSource({
      adapterConfig: { url: 'https://api.example.com/listings', itemsPath: '$.data[*]', idPath: '$.id', urlPath: '$.url' },
    });

    const out = await new CustomApiAdapter().fetchListings(source);

    expect(httpGet).toHaveBeenCalledWith('https://api.example.com/listings', expect.any(Object));
    expect(out.map((r) => r.id)).toEqual(['a-1', 'a-2']);
  });

  it('applies legacy `params` as query-string values', async () => {
    httpGet.mockResolvedValue({ data: { data: LISTINGS } });

    const source = makeSource({
      adapterConfig: {
        url: 'https://api.example.com/wp-json/wp/v2/posts',
        params: { per_page: 20, _embed: true },
        itemsPath: '$.data[*]',
        idPath: '$.id',
      },
    });

    await new CustomApiAdapter().fetchListings(source);

    const calledUrl = httpGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('per_page=20');
    expect(calledUrl).toContain('_embed=true');
  });

  it('keeps items whose configured idPath misses instead of dropping them', async () => {
    httpGet.mockResolvedValue({ data: { data: [{ reference: 'REF-7', title: 'Studio flat', price: 60000 }] } });

    const source = makeSource({
      adapterConfig: { endpoint: 'https://api.example.com/listings', itemsPath: '$.data[*]', idPath: '$.id' },
    });

    const out = await new CustomApiAdapter().fetchListings(source);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('REF-7');
  });

  it('raises a user-fixable error when the endpoint is missing', async () => {
    const source = makeSource({ adapterConfig: { itemsPath: '$.data[*]' } });

    await expect(new CustomApiAdapter().fetchListings(source)).rejects.toBeInstanceOf(ListingSourceConfigError);
    await expect(new CustomApiAdapter().fetchListings(source)).rejects.toThrow(/Test Agency/);
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('rejects a non-fetchable endpoint before making a request', async () => {
    const source = makeSource({ adapterConfig: { endpoint: 'manual://imported', itemsPath: '$.data[*]' } });

    await expect(new CustomApiAdapter().fetchListings(source)).rejects.toBeInstanceOf(ListingSourceConfigError);
    expect(httpGet).not.toHaveBeenCalled();
  });
});

describe('JsonFeedAdapter', () => {
  beforeEach(() => httpGet.mockReset());

  it('fetches when the config uses the legacy `url` key', async () => {
    httpGet.mockResolvedValue({ data: LISTINGS });

    const source = makeSource({
      adapterType: 'jsonFeed',
      adapterConfig: { url: 'https://api.example.com/feed.json', itemsPath: '$[*]', idPath: '$.id' },
    });

    const out = await new JsonFeedAdapter().fetchListings(source);

    expect(httpGet).toHaveBeenCalledWith('https://api.example.com/feed.json', expect.any(Object));
    expect(out.map((r) => r.id)).toEqual(['a-1', 'a-2']);
  });

  it('still supports inlineJson sources', async () => {
    const source = makeSource({
      adapterType: 'jsonFeed',
      adapterConfig: { inlineJson: JSON.stringify(LISTINGS), itemsPath: '$[*]', idPath: '$.id' },
    });

    const out = await new JsonFeedAdapter().fetchListings(source);
    expect(out.map((r) => r.id)).toEqual(['a-1', 'a-2']);
    expect(httpGet).not.toHaveBeenCalled();
  });

  it('raises a user-fixable error when neither endpoint nor inlineJson is set', async () => {
    const source = makeSource({ adapterType: 'jsonFeed', adapterConfig: { itemsPath: '$[*]', idPath: '$.id' } });

    await expect(new JsonFeedAdapter().fetchListings(source)).rejects.toBeInstanceOf(ListingSourceConfigError);
  });
});
