process.env.SKIP_TEST_DB = 'true';

import { extractEmbeddedSpaListings, readJsonObjectAt } from '../../services/listingAdapters/embeddedState';
import { FEED_SYNC_MAX, parseListingLimit } from '../../utils/listingFetchLimit';

const listing = (n: number) => ({ id: n, title: `Kuća ${n}`, price: 90000 + n, city: 'Mostar', description: 'x'.repeat(200) });

describe('extractEmbeddedSpaListings', () => {
  it('reads listings from Next.js page data', () => {
    const data = { props: { pageProps: { search: { results: [listing(1), listing(2)] } } } };
    const html = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`;
    expect(extractEmbeddedSpaListings(html)).toMatchObject({ source: '__NEXT_DATA__', itemsPath: '$.search.results[*]' });
  });

  it('reads a large window.__INITIAL_STATE__ (beyond the old 8 KB cut-off)', () => {
    const state = { listings: Array.from({ length: 80 }, (_, i) => listing(i)) };
    const html = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script>`;
    expect(JSON.stringify(state).length).toBeGreaterThan(8000);
    expect(extractEmbeddedSpaListings(html)?.items).toHaveLength(80);
  });

  it('scans balanced braces without being fooled by braces inside strings', () => {
    const text = 'x = {"a": "} not the end {", "b": {"c": 1}} trailing';
    expect(readJsonObjectAt(text, text.indexOf('{'))).toEqual({ a: '} not the end {', b: { c: 1 } });
  });
});

describe('parseListingLimit', () => {
  it('fetches the whole feed when no limit is asked for', () => {
    expect(parseListingLimit(undefined, FEED_SYNC_MAX)).toEqual({ ok: true, value: FEED_SYNC_MAX });
  });

  it('caps and rejects bad limits', () => {
    expect(parseListingLimit('99999', 2000)).toEqual({ ok: true, value: 2000 });
    expect(parseListingLimit('24.7', 2000)).toEqual({ ok: true, value: 24 });
    expect(parseListingLimit('0', 2000)).toEqual({ ok: false, error: 'limit must be a positive integer between 1 and 2000' });
  });
});
