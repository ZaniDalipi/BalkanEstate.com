process.env.SKIP_TEST_DB = 'true';

jest.mock('../../services/listingAdapters/httpClient', () => ({ httpGet: jest.fn() }));

import { httpGet } from '../../services/listingAdapters/httpClient';
import { XmlFeedAdapter } from '../../services/listingAdapters/XmlFeedAdapter';
import { detectXmlFeed, looksLikeXml } from '../../services/listingAdapters/xmlFeed/detectXmlFeed';
import { extractMappedFields } from '../../services/listingNormalizerService';
import type { IListingSource } from '../../models/ListingSource';

/** An agency export in the widespread Kyero-style layout. */
const KYERO = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <kyero><feed_version>3</feed_version></kyero>
  ${[1, 2, 3].map((n) => `
  <property>
    <id>${n}</id><ref>BUD-${n}</ref>
    <price currency="EUR">${150000 + n * 1000}</price>
    <type>apartment</type><town>Budva</town><country>Montenegro</country>
    <location><latitude>42.28</latitude><longitude>18.84</longitude></location>
    <beds>${n + 1}</beds><baths>${n}</baths><living_rooms>1</living_rooms>
    <surface_area><built>${60 + n}</built><plot>0</plot></surface_area>
    <url>https://agency.example/p/${n}</url>
    <desc><en>Sea view flat number ${n}</en></desc>
    <images><image id="1"><url>https://cdn.example/${n}-1.jpg</url></image><image id="2"><url>https://cdn.example/${n}-2.jpg</url></image></images>
  </property>`).join('')}
</root>`;

describe('detectXmlFeed', () => {
  it('finds the repeated listing element and how to identify it', async () => {
    const found = await detectXmlFeed(KYERO);
    expect(found).toMatchObject({ kind: 'listings', itemsPath: "$['root']['property'][*]", idPath: "$['id']", urlPath: "$['url']" });
    expect(found?.kind === 'listings' && found.items).toHaveLength(3);
  });

  it('tells RSS apart, and ignores sitemaps and HTML pages', async () => {
    expect(await detectXmlFeed('<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>')).toEqual({ kind: 'rss' });
    expect(await detectXmlFeed('<?xml version="1.0"?><urlset><url><loc>x</loc></url></urlset>')).toBeNull();
    expect(looksLikeXml('<!DOCTYPE html><html></html>')).toBe(false);
  });
});

describe('XmlFeedAdapter + field mapping', () => {
  const source = {
    slug: 'kyero-test',
    adapterType: 'xmlFeed',
    adapterConfig: { endpoint: 'https://agency.example/feed.xml', itemsPath: "$['root']['property'][*]", idPath: "$['id']", urlPath: "$['url']" },
    fieldMap: { title: 'desc.en' },
  } as unknown as IListingSource;

  beforeEach(() => (httpGet as jest.Mock).mockResolvedValue({ data: KYERO }));

  it('returns every listing in the file with every attribute mapped', async () => {
    const raws = await new XmlFeedAdapter().fetchListings(source);
    expect(raws.map((r) => r.id)).toEqual(['1', '2', '3']);
    const mapped = extractMappedFields(raws[1], source);
    expect(mapped).toMatchObject({
      title: 'Sea view flat number 2', price: '152000', city: 'Budva', country: 'Montenegro',
      beds: 3, baths: 2, livingRooms: 1, sqft: 62, lat: 42.28, lng: 18.84,
    });
  });

  it('re-locates the listings when the saved path no longer matches the file', async () => {
    const stale = { ...source, adapterConfig: { ...source.adapterConfig, itemsPath: '$.listings.listing[*]' } } as unknown as IListingSource;
    const raws = await new XmlFeedAdapter().fetchListings(stale);
    expect(raws).toHaveLength(3);
  });
});
