process.env.SKIP_TEST_DB = 'true';

jest.mock('../../services/listingAdapters/httpClient', () => ({ httpGet: jest.fn() }));

import type { Response } from 'express';
import { httpGet } from '../../services/listingAdapters/httpClient';
import { CustomApiAdapter } from '../../services/listingAdapters/CustomApiAdapter';
import { checkAdapterConfig, FeedConfigError } from '../../services/listingAdapters/adapterConfig';
import { feedConfigOrRespond } from '../../middleware/feedConfigValidation';
import type { IListingSource } from '../../models/ListingSource';

/**
 * A feed whose settings can't work is refused when saved, with the setting
 * at fault named; what can be worked out (where the list is, which field is
 * the id) gets a default instead of failing at sync time.
 */
describe('checkAdapterConfig', () => {
  it('requires a web address for an API feed, and names the setting', () => {
    expect(checkAdapterConfig('customApi', {})).toEqual({
      ok: false,
      problems: [{ field: 'adapterConfig.endpoint', code: 'missingEndpoint', message: expect.any(String) }],
    });
    expect(checkAdapterConfig('customApi', { endpoint: 'api.example.com/x' })).toMatchObject({ ok: false, problems: [{ code: 'invalidUrl' }] });
  });

  it('brings older settings up to date and fills defaults', () => {
    const check = checkAdapterConfig('customApi', { url: 'https://api.example.com/l', params: { per_page: 100 } });
    expect(check).toEqual({
      ok: true,
      config: expect.objectContaining({ endpoint: 'https://api.example.com/l', query: { per_page: 100 }, idPath: '$.id' }),
    });
    expect(checkAdapterConfig('rss', { feedUrl: 'https://a.example/feed' })).toMatchObject({ ok: true, config: { feedUrls: ['https://a.example/feed'] } });
  });

  it('checks pasted listings and page-scrape settings', () => {
    expect(checkAdapterConfig('jsonFeed', {})).toMatchObject({ ok: false, problems: [{ code: 'missingSource' }] });
    expect(checkAdapterConfig('jsonFeed', { inlineJson: '{"a":' })).toMatchObject({ ok: false, problems: [{ code: 'invalidInlineJson' }] });
    expect(checkAdapterConfig('jsonFeed', { inlineJson: '[{"title":"x"}]' })).toMatchObject({ ok: true });
    expect(checkAdapterConfig('htmlScrape', { indexUrl: 'https://a.example/' })).toMatchObject({ ok: false, problems: [{ code: 'missingSelectors' }] });
    expect(checkAdapterConfig('xmlFeed', [])).toMatchObject({ ok: false, problems: [{ code: 'notAnObject' }] });
  });
});

describe('CustomApiAdapter', () => {
  const source = (adapterConfig: Record<string, unknown>) => ({ slug: 's', adapterConfig } as unknown as IListingSource);

  it('runs without items and id paths: it finds the list and the ids itself', async () => {
    (httpGet as jest.Mock).mockResolvedValue({
      data: { meta: { total: 2 }, results: [
        { id: 7, title: 'Flat', price: 90000, city: 'Split' },
        { id: 8, title: 'House', price: 250000, city: 'Split' },
      ] },
    });
    const raws = await new CustomApiAdapter().fetchListings(source({ endpoint: 'https://api.example.com/l' }), { limit: 10 });
    expect(raws.map((r) => r.id)).toEqual(['7', '8']);
  });

  it('fails with a reason the page can show when it has no address', async () => {
    const run = new CustomApiAdapter().fetchListings(source({ itemsPath: '$[*]' }));
    await expect(run).rejects.toBeInstanceOf(FeedConfigError);
    await expect(run).rejects.toMatchObject({ code: 'missingEndpoint', message: expect.stringContaining('no web address') });
  });
});

describe('feedConfigOrRespond', () => {
  it('answers 400 with every problem, in the shape other validation errors use', () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    expect(feedConfigOrRespond(res, 'customApi', { endpoint: '' })).toBeNull();
    expect(res.status).toHaveBeenCalledWith(400);
    expect((res.json as jest.Mock).mock.calls[0][0]).toMatchObject({
      code: 'FEED_CONFIG_INVALID',
      errors: [{ field: 'adapterConfig.endpoint', code: 'missingEndpoint' }],
    });
  });
});
