import { JsonFeedAdapter } from '../services/listingAdapters/JsonFeedAdapter';
import type { IListingSource } from '../models/ListingSource';

const makeSource = (inlineJson: string): IListingSource =>
  ({
    slug: 'test-source',
    adapterConfig: {
      inlineJson,
      itemsPath: '$[*]',
      idPath: '$.id',
    },
  } as unknown as IListingSource);

const row = { id: '1', title: "Owner's flat", price: 95000, city: 'Split' };

describe('JsonFeedAdapter inlineJson parsing', () => {
  it('reads well-formed inlineJson normally', async () => {
    const adapter = new JsonFeedAdapter();
    const out = await adapter.fetchListings(makeSource(JSON.stringify([row])));
    expect(out).toHaveLength(1);
    expect(out[0].raw).toMatchObject({ title: "Owner's flat" });
  });

  it('self-heals inlineJson that was corrupted by curly "smart quotes" (e.g. from macOS autocorrect in the Edit form)', async () => {
    // Simulates a stored source whose inlineJson had every straight double-quote
    // rewritten to a curly one — the failure mode a broken existing source has.
    let toggle = true;
    const smartQuoted = JSON.stringify([row]).replace(/"/g, () => (toggle = !toggle) ? '”' : '“');

    const adapter = new JsonFeedAdapter();
    const out = await adapter.fetchListings(makeSource(smartQuoted));
    expect(out).toHaveLength(1);
    expect(out[0].raw).toMatchObject({ title: "Owner's flat", city: 'Split' });
  });

  it('throws a clear error when inlineJson is genuinely unrecoverable', async () => {
    const adapter = new JsonFeedAdapter();
    await expect(adapter.fetchListings(makeSource('{ not json at all'))).rejects.toThrow(
      /inlineJson is not valid JSON/
    );
  });
});
