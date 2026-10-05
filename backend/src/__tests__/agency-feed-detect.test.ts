/**
 * Agency property feeds — detecting the structure of a non-canonical export
 * and suggesting a mapping that imports it.
 */
process.env.SKIP_TEST_DB = 'true';

import { readXmlDocument } from '../services/agencyFeeds/xmlRecordReader';
import { detectStructure } from '../services/agencyFeeds/structureDetector';
import { mapRecord, validateMapping } from '../services/agencyFeeds/fieldMapper';
import { normalizeRecord } from '../services/agencyFeeds/listingNormalizer';
import { CANONICAL_MAPPING } from '../services/agencyFeeds/canonicalFormat';

// The layout typical of WordPress / CRM exports: <properties><property>… with nested media.
const exportXml = `<?xml version="1.0" encoding="UTF-8"?>
<export generator="EstateAssistantSync">
  <properties>
    ${[1, 2, 3].map((i) => `
    <property>
      <id>140-515${i}</id>
      <title><![CDATA[Двособен стан ${i}]]></title>
      <description><![CDATA[<p>Светол стан во центар.</p>]]></description>
      <offer>sale</offer>
      <type>Apartment</type>
      <price currency="EUR">8500${i}</price>
      <location><country>North Macedonia</country><city>Skopje</city><address>Partizanska ${i}</address></location>
      <size>65</size>
      <bedrooms>2</bedrooms>
      <bathrooms>1</bathrooms>
      <images>
        <image><url>https://unlimited.example/wp-content/uploads/${i}-a.jpeg</url></image>
        <image><url>https://unlimited.example/wp-content/uploads/${i}-b.jpeg</url></image>
      </images>
    </property>`).join('')}
  </properties>
</export>`;

describe('detectStructure', () => {
  it('finds nothing with the canonical mapping, then detects the property element and fields', () => {
    const parsed = readXmlDocument(exportXml, CANONICAL_MAPPING.recordElement);
    expect(parsed.records).toHaveLength(0);

    const detected = detectStructure(parsed.header)!;
    expect(detected.recordElement).toBe('property');
    expect(detected.sampleCount).toBe(3);
    expect(detected.suggestedMapping.fields).toMatchObject({
      externalId: 'id',
      title: 'title',
      description: 'description',
      listingType: 'offer',
      propertyType: 'type',
      price: 'price',
      currency: 'price/@currency',
      country: 'location/country',
      city: 'location/city',
      address: 'location/address',
      area: 'size',
      bedrooms: 'bedrooms',
      bathrooms: 'bathrooms',
      images: 'images/image/url',
    });
    expect(validateMapping(detected.suggestedMapping)).toEqual([]);
  });

  it('the suggested mapping imports every listing with its photos in order', () => {
    const { suggestedMapping } = detectStructure(readXmlDocument(exportXml, 'listing').header)!;
    const results = readXmlDocument(exportXml, suggestedMapping.recordElement).records.map((r) =>
      normalizeRecord(mapRecord(r, suggestedMapping), suggestedMapping)
    );
    expect(results.map((r) => r.listing?.externalId)).toEqual(['140-5151', '140-5152', '140-5153']);
    expect(results[0].listing).toMatchObject({ listingType: 'sale', propertyType: 'apartment', price: 85001, city: 'Skopje', sqft: 65 });
    expect(results[0].listing?.imageUrls).toEqual([
      'https://unlimited.example/wp-content/uploads/1-a.jpeg',
      'https://unlimited.example/wp-content/uploads/1-b.jpeg',
    ]);
  });

  it('returns nothing for a document with no repeated data', () => {
    expect(detectStructure(readXmlDocument('<r><a>1</a></r>', 'listing').header)).toBeNull();
  });
});
