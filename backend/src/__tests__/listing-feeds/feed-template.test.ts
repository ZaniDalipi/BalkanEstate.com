process.env.SKIP_TEST_DB = 'true';

/**
 * The add-feed wizard shows agencies a template (JSON and XML) for
 * publishing their listings. Whatever follows it must import completely:
 * these run both templates through detection, the adapter and the field
 * mapping, exactly as a real feed goes.
 */

jest.mock('axios', () => {
  const get = jest.fn();
  return { __esModule: true, default: { get, isAxiosError: () => false }, get, isAxiosError: () => false };
});
jest.mock('../../services/listingAdapters/httpClient', () => ({ httpGet: jest.fn() }));

import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { httpGet } from '../../services/listingAdapters/httpClient';
import { detectFeedForUrl, detectFromJsonSample } from '../../services/listingDetectorService';
import { getAdapter } from '../../services/listingAdapters';
import {
  collectImageUrls, explicitListingType, extractMappedFields, parsePriceAmount, resolvePropertyType,
} from '../../services/listingNormalizerService';
import { resolveLocation } from '../../services/listingAttributes/resolveLocation';
import { feedCoverage } from '../../services/listingAttributes/feedCoverage';
import type { IListingSource } from '../../models/ListingSource';

const TEMPLATES = join(__dirname, '../../../../src/features/listing-sources/feedTemplate');
const jsonTemplate = readFileSync(join(TEMPLATES, 'listings-template.json'), 'utf8');
const xmlTemplate = readFileSync(join(TEMPLATES, 'listings-template.xml'), 'utf8');

/** Amenities as names: strings (XML) or schema.org amenityFeature objects (JSON). */
const amenityNamesOf = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).map((a) => (typeof a === 'string' ? a : (a as { name: string }).name));

const importAll = async (source: IListingSource) => {
  const raws = await getAdapter(source).fetchListings(source);
  return raws.map((raw) => {
    const m = extractMappedFields(raw, source);
    return {
      id: raw.id,
      title: m.title,
      price: parsePriceAmount(m.price),
      listingType: explicitListingType(m),
      propertyType: resolvePropertyType(m),
      location: resolveLocation(m, raw.url),
      beds: Number(m.beds), baths: Number(m.baths), livingRooms: Number(m.livingRooms), area: Number(m.sqft),
      yearBuilt: Number(m.yearBuilt), photos: collectImageUrls(m),
      amenities: m.amenities,
      url: raw.url,
    };
  });
};

const expectTemplateListings = (listings: Awaited<ReturnType<typeof importAll>>) => {
  expect(listings).toHaveLength(2);
  const [sale, rent] = listings;
  expect(sale).toMatchObject({
    id: 'A-1024', title: 'Sea-view apartment with terrace', price: 185000, listingType: 'sale', propertyType: 'apartment',
    location: { city: 'Vlore', country: 'Albania', lat: 40.3838, lng: 19.4553 },
    beds: 2, baths: 1, area: 74, yearBuilt: 2022, url: 'https://your-agency.com/listings/a-1024',
    photos: ['https://your-agency.com/photos/a-1024-1.jpg', 'https://your-agency.com/photos/a-1024-2.jpg'],
  });
  expect(sale.location.address).toContain('Rruga Radhime 12');
  expect(amenityNamesOf(sale.amenities)).toEqual(['Sea view', 'Balcony', 'Elevator']);
  expect(rent).toMatchObject({
    id: 'B-2048', price: 900, listingType: 'rent', propertyType: 'house',
    location: { city: 'Pula', country: 'Croatia' }, beds: 3, baths: 2, area: 140,
    photos: ['https://your-agency.com/photos/b-2048-1.jpg'],
  });
};

describe('the JSON feed template (schema.org RealEstateListing)', () => {
  it('imports every field of every listing', async () => {
    const detected = detectFromJsonSample(jsonTemplate);
    expect(detected.adapterType).toBe('jsonFeed');
    const source = {
      slug: 't', adapterType: detected.adapterType, fieldMap: detected.fieldMap,
      adapterConfig: { ...detected.adapterConfig, inlineJson: jsonTemplate },
    } as unknown as IListingSource;
    expectTemplateListings(await importAll(source));
  });

  it('shows every field as found in the wizard checklist', () => {
    const detected = detectFromJsonSample(jsonTemplate);
    expect(feedCoverage(detected.sample!, detected.fieldMap).filter((c) => !c.found)).toEqual([]);
  });
});

describe('the XML feed template', () => {
  it('is detected from its link and imports every field of every listing', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ status: 200, data: xmlTemplate, request: {} });
    (httpGet as jest.Mock).mockResolvedValue({ data: xmlTemplate });
    const detected = await detectFeedForUrl('https://your-agency.com/feed.xml');
    expect(detected.adapterType).toBe('xmlFeed');
    expect(feedCoverage(detected.sample!, detected.fieldMap).filter((c) => !c.found)).toEqual([]);
    const source = {
      slug: 't', adapterType: detected.adapterType, fieldMap: detected.fieldMap, adapterConfig: detected.adapterConfig,
    } as unknown as IListingSource;
    expectTemplateListings(await importAll(source));
  });
});
