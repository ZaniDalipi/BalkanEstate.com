/**
 * Agency property feeds: XML reading, field mapping and normalization.
 * Pure functions only — no database, no network.
 */
process.env.SKIP_TEST_DB = 'true';

import fs from 'fs';
import path from 'path';
import { readXmlDocument } from '../services/agencyFeeds/xmlRecordReader';
import { mapRecord, validateMapping } from '../services/agencyFeeds/fieldMapper';
import { normalizeRecord, parseLocaleNumber } from '../services/agencyFeeds/listingNormalizer';
import { CANONICAL_MAPPING } from '../services/agencyFeeds/canonicalFormat';
import { FeedDocumentError, type FeedMapping } from '../services/agencyFeeds/feedTypes';
import { htmlToPlainText } from '../services/agencyFeeds/contentSanitizer';

const SAMPLE = fs.readFileSync(path.join(__dirname, '../../../docs/integrations/agency-feeds/sample-feed.xml'));

const normalizeAll = (xml: string | Buffer, mapping: FeedMapping = CANONICAL_MAPPING) =>
  readXmlDocument(xml, mapping.recordElement).records.map((r) => normalizeRecord(mapRecord(r, mapping), mapping));

const docError = (fn: () => unknown): FeedDocumentError => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(FeedDocumentError);
    return err as FeedDocumentError;
  }
  throw new Error('expected a FeedDocumentError');
};

describe('sample canonical feed', () => {
  const results = normalizeAll(SAMPLE);

  it('reads every listing, including the removal notice', () => {
    expect(results).toHaveLength(4);
    expect(results.map((r) => r.listing?.externalId)).toEqual(['ADR-1001', 'ADR-1002', 'ADR-1003', 'ADR-0990']);
    expect(results.every((r) => r.issues.every((i) => i.severity !== 'error'))).toBe(true);
  });

  it('turns CDATA HTML into plain text and keeps repeated images in order', () => {
    const apt = results[0].listing!;
    expect(apt.title).toBe('Sea-view apartment near Bačvice beach');
    expect(apt.description).not.toMatch(/<[a-z]/i);
    expect(apt.description).toContain('• Open-plan kitchen and living room');
    expect(apt.imageUrls).toEqual([
      'https://adriatic-homes.example/media/ADR-1001/1.jpg',
      'https://adriatic-homes.example/media/ADR-1001/2.jpg',
      'https://adriatic-homes.example/media/ADR-1001/3.jpg',
    ]);
    expect(apt.floorplans).toEqual([{ url: 'https://adriatic-homes.example/media/ADR-1001/plan.png', label: 'Third floor' }]);
    expect(apt).toMatchObject({ price: 285000, listingType: 'sale', propertyType: 'apartment', beds: 2, baths: 1, energyRating: 'B', lat: 43.5025 });
  });

  it('never exposes an address the source marks private', () => {
    const house = results[1].listing!;
    expect(house.addressPrivate).toBe(true);
    expect(house.address).toBe('Dobrota, Kotor');
    expect(JSON.stringify(house)).not.toContain('Not shown publicly');
    // Coordinates are coarsened to roughly 1 km.
    expect(house.lat).toBe(42.44);
    expect(house.lng).toBe(18.77);
  });

  it('leaves optional details absent instead of inventing them', () => {
    const studio = results[2].listing!;
    expect(studio.lat).toBeUndefined();
    expect(studio.yearBuilt).toBeUndefined();
    expect(studio.energyRating).toBeUndefined();
    expect(studio.sourceUrl).toBeUndefined();
    expect(studio.beds).toBe(0);
    expect(studio.rentPeriod).toBe('monthly');
  });

  it('accepts a removal notice with nothing but an ID', () => {
    expect(results[3].listing).toMatchObject({ externalId: 'ADR-0990', feedStatus: 'removed' });
  });
});

describe('XML safety and robustness', () => {
  it('refuses DOCTYPE declarations (XXE, entity expansion)', () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r><listing><id>&x;</id></listing></r>`;
    expect(docError(() => readXmlDocument(xxe, 'listing')).code).toBe('doctype_forbidden');
    const laughs = `<!DOCTYPE r [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">]><r><listing>&b;</listing></r>`;
    expect(docError(() => readXmlDocument(laughs, 'listing')).code).toBe('doctype_forbidden');
  });

  it('rejects a truncated download', () => {
    const cut = SAMPLE.subarray(0, Math.floor(SAMPLE.length / 2));
    expect(docError(() => readXmlDocument(cut, 'listing')).code).toBe('truncated');
  });

  it('rejects malformed XML and empty responses', () => {
    expect(docError(() => readXmlDocument('<r><listing></r>', 'listing')).code).toBe('invalid_xml');
    expect(docError(() => readXmlDocument('', 'listing')).code).toBe('empty_document');
  });

  it('enforces record, size and depth limits instead of truncating', () => {
    const many = `<r>${'<listing><id>1</id></listing>'.repeat(11)}</r>`;
    expect(docError(() => readXmlDocument(many, 'listing', { maxRecords: 10 })).code).toBe('too_many_records');
    expect(docError(() => readXmlDocument(many, 'listing', { maxBytes: 100 })).code).toBe('too_large');
    const deep = `<r>${'<a>'.repeat(60)}${'</a>'.repeat(60)}</r>`;
    expect(docError(() => readXmlDocument(deep, 'listing')).code).toBe('too_deep');
  });

  it('matches elements by local name whatever the namespace prefix', () => {
    const xml = `<re:feed xmlns:re="urn:x"><re:listing re:id="7"><re:title>T</re:title></re:listing></re:feed>`;
    const { records } = readXmlDocument(xml, 'listing');
    expect(records).toHaveLength(1);
    expect(records[0].attrs.id).toBe('7');
    expect(records[0].children[0]).toMatchObject({ name: 'title', text: 'T' });
  });

  it('decodes the encoding the XML declaration names', () => {
    // 0x9A is "š" in windows-1250 (and not valid UTF-8 on its own).
    const raw = Buffer.concat([
      Buffer.from('<?xml version="1.0" encoding="windows-1250"?><r><listing><city>Ni'),
      Buffer.from([0x9a]),
      Buffer.from('</city></listing></r>'),
    ]);
    const { records } = readXmlDocument(raw, 'listing');
    expect(records[0].children[0].text).toBe('Niš');
  });
});

describe('custom mappings', () => {
  const mapping: FeedMapping = {
    recordElement: 'property',
    fields: {
      externalId: '@ref',
      title: 'headline',
      description: 'body',
      listingType: 'offer',
      propertyType: 'kind',
      price: 'cost/amount',
      currency: 'cost/@cur',
      country: 'place/@country',
      city: 'place/town',
      address: 'place/street',
      area: 'size',
      bedrooms: 'rooms/@beds',
      bathrooms: 'rooms/@baths',
      images: 'photos/photo/@src',
    },
    valueMaps: { listingType: { prodaja: 'sale' }, propertyType: { stan: 'apartment' } },
    areaUnit: 'sqft',
  };
  const xml = `<export><property ref="X-1"><headline>Stan</headline><body>Opis</body><offer>Prodaja</offer>
    <kind>STAN</kind><cost cur="eur"><amount>120.000</amount></cost><place country="Serbia"><town>Beograd</town><street>Ulica 1</street></place>
    <size>1076.39</size><rooms beds="2" baths="1"/><photos><photo src="https://a.example/1.jpg"/><photo src="javascript:alert(1)"/></photos></property></export>`;

  it('reads attributes, nested paths, value maps and unit conversion', () => {
    const [result] = normalizeAll(xml, mapping);
    expect(result.listing).toMatchObject({
      externalId: 'X-1', listingType: 'sale', propertyType: 'apartment', price: 120000, city: 'Beograd', sqft: 100, beds: 2,
    });
    expect(result.listing!.imageUrls).toEqual(['https://a.example/1.jpg']);
    expect(result.issues.map((i) => i.code)).toContain('invalid_media_url');
  });

  it('validates mapping configuration', () => {
    expect(validateMapping(mapping)).toEqual([]);
    expect(validateMapping({ recordElement: 'p', fields: { title: '../../etc' } })).toEqual(
      expect.arrayContaining([expect.stringContaining('Invalid path'), expect.stringContaining('"externalId" is required')])
    );
    expect(validateMapping({ recordElement: '<x>', fields: {} })[0]).toContain('recordElement');
    const unsafeKeys = validateMapping({ ...mapping, valueMaps: { listingType: { $where: 'sale', 'a.b': 'rent' } } });
    expect(unsafeKeys).toHaveLength(2);
  });
});

describe('normalization rules', () => {
  const record = (fields: string) => `<f><listing><id>A1</id><title>T</title><description>D</description><transaction>sale</transaction>
    <type>apartment</type><location><country>Albania</country><city>Tirana</city><address>Rr. 1</address></location>
    <area>50</area><bedrooms>1</bedrooms><bathrooms>1</bathrooms><images><image url="https://x.example/a.jpg"/></images>${fields}</listing></f>`;

  it('rejects a record without a stated currency, and non-EUR prices', () => {
    expect(normalizeAll(record('<price>100000</price>'))[0].issues.map((i) => i.code)).toContain('missing_currency');
    expect(normalizeAll(record('<price currency="USD">100000</price>'))[0].issues.map((i) => i.code)).toContain('unsupported_currency');
  });

  it('accepts price on request without inventing an amount', () => {
    const [r] = normalizeAll(record('<price on-request="true"/>'));
    expect(r.listing).toMatchObject({ price: 0, isNegotiable: true });
  });

  it('rejects records missing required details and reports each one', () => {
    const [r] = normalizeAll('<f><listing><id>B 2</id><price currency="EUR">1</price></listing></f>');
    expect(r.listing).toBeUndefined();
    expect(r.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['invalid_external_id', 'missing_title', 'missing_description', 'invalid_listing_type', 'invalid_property_type', 'missing_city', 'missing_images'])
    );
  });

  it('parses both decimal conventions', () => {
    expect(parseLocaleNumber('185.000')).toBe(185000);
    expect(parseLocaleNumber('185,000.50')).toBe(185000.5);
    expect(parseLocaleNumber('185.000,50')).toBe(185000.5);
    expect(parseLocaleNumber('74,5')).toBe(74.5);
    expect(parseLocaleNumber('€ 1 250')).toBe(1250);
    expect(parseLocaleNumber('abc')).toBeUndefined();
  });

  it('strips markup and scripts from imported text', () => {
    expect(htmlToPlainText('<script>alert(1)</script><b>Big</b> &amp; bright<br>flat')).toBe('Big & bright\nflat');
  });
});
