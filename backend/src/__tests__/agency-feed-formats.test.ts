/**
 * Agency property feeds — reading any XML property feed: the Kyero and
 * Trovit portal formats, a never-seen layout, the auto format that recognises
 * them and remembers the result, and the field catalog shown to the agency.
 */
jest.mock('../jobs/propertyAlertsJob', () => ({
  ...jest.requireActual('../jobs/propertyAlertsJob'),
  processInstantPriceDropForProperty: jest.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import AgencyFeed from '../models/AgencyFeed';
import AgencyFeedRun from '../models/AgencyFeedRun';
import { claimNextJob, processJob } from '../services/agencyFeeds/feedJobQueue';
import { readXmlDocument } from '../services/agencyFeeds/xmlRecordReader';
import { mapRecord, selectValues } from '../services/agencyFeeds/fieldMapper';
import { normalizeRecord } from '../services/agencyFeeds/listingNormalizer';
import { FORMAT_PROFILES, resolveFormat } from '../services/agencyFeeds/formatProfiles';
import { buildFieldCatalog } from '../services/agencyFeeds/structureDetector';
import type { FeedMapping } from '../services/agencyFeeds/feedTypes';
import { createAgencySetup, createWorld, feedXml, type AgencySetup } from './helpers/agencyFeedFixtures';

const KYERO = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <kyero><feed_version>3</feed_version></kyero>
  <property>
    <id>KY-1</id><date>2026-09-30 10:00:00</date><ref>V-1</ref>
    <price>120000</price><currency>EUR</currency><price_freq>sale</price_freq>
    <type>villa</type><town>Varna</town><province>Varna</province><country>Bulgaria</country>
    <location><latitude>43.2</latitude><longitude>27.9</longitude></location>
    <beds>3</beds><baths>2</baths>
    <surface_area><built>140</built><plot>500</plot></surface_area>
    <url><en>https://agency.example/en/ky-1</en></url>
    <desc><en><![CDATA[<p>Sea view villa</p>]]></en><bg>Вила с изглед към морето</bg></desc>
    <features><feature>Pool</feature><feature>Garden</feature></features>
    <images>
      <image id="1"><url>https://agency.example/ky-1/1.jpg</url></image>
      <image id="2"><url>https://agency.example/ky-1/2.jpg</url></image>
    </images>
  </property>
  <property>
    <id>KY-2</id><price>600</price><currency>EUR</currency><price_freq>month</price_freq>
    <type>apartment</type><town>Sofia</town><country>Bulgaria</country><beds>1</beds><baths>1</baths>
    <surface_area><built>55</built></surface_area>
    <desc><en>Flat in the centre</en></desc>
    <images><image id="1"><url>https://agency.example/ky-2/1.jpg</url></image></images>
  </property>
</root>`;

const TROVIT = `<?xml version="1.0" encoding="utf-8"?>
<trovit>
  <ad>
    <id><![CDATA[TR-7]]></id>
    <url><![CDATA[https://agency.example/tr-7]]></url>
    <title><![CDATA[Bright flat near the park]]></title>
    <type><![CDATA[For Sale]]></type>
    <property_type><![CDATA[Apartment]]></property_type>
    <content><![CDATA[Two bedrooms, renovated.]]></content>
    <price currency="BGN">195583</price>
    <city><![CDATA[Plovdiv]]></city><country>Bulgaria</country>
    <floor_area unit="meters">72</floor_area><rooms>2</rooms><bathrooms>1</bathrooms>
    <pictures><picture><picture_url><![CDATA[https://agency.example/tr-7/a.jpg]]></picture_url></picture></pictures>
  </ad>
</trovit>`;

const UNKNOWN = `<?xml version="1.0"?>
<EstateAssistantSync>
  <Offers>
    <Offer><OfferId>EA-1</OfferId><Transaction>Sale</Transaction><PropertyType>Apartment</PropertyType><Price>85000</Price><Currency>EUR</Currency>
      <City>Skopje</City><Country>North Macedonia</Country><Area>60</Area><Bedrooms>2</Bedrooms><Bathrooms>1</Bathrooms><Description>Renovated flat</Description>
      <Photos><Photo>https://agency.example/ea-1.jpg</Photo></Photos></Offer>
    <Offer><OfferId>EA-2</OfferId><Transaction>Sale</Transaction><PropertyType>House</PropertyType><Price>150000</Price><Currency>EUR</Currency>
      <City>Ohrid</City><Country>North Macedonia</Country><Area>120</Area><Bedrooms>3</Bedrooms><Bathrooms>2</Bathrooms><Description>House with a yard</Description>
      <Photos><Photo>https://agency.example/ea-2.jpg</Photo></Photos></Offer>
  </Offers>
</EstateAssistantSync>`;

const read = (xml: string, mapping: FeedMapping) =>
  readXmlDocument(xml, mapping.recordElement).records.map((r) => normalizeRecord(mapRecord(r, mapping), mapping));

const profile = (id: string) => FORMAT_PROFILES.find((p) => p.id === id)!.mapping;

describe('portal format profiles', () => {
  it('recognises Kyero and reads its nested, multilingual fields', () => {
    const header = readXmlDocument(KYERO, 'listing').header!;
    expect(resolveFormat(header)).toMatchObject({ source: 'profile', profileId: 'kyero', label: 'Kyero' });

    const [villa, flat] = read(KYERO, profile('kyero'));
    expect(villa.listing).toMatchObject({
      externalId: 'KY-1', listingType: 'sale', propertyType: 'villa', price: 120000, city: 'Varna',
      beds: 3, sqft: 140, sourceUrl: 'https://agency.example/en/ky-1',
      imageUrls: ['https://agency.example/ky-1/1.jpg', 'https://agency.example/ky-1/2.jpg'],
    });
    expect(villa.listing?.description).toContain('Sea view villa');
    // Kyero has no title: one is derived from what the feed does say, and the agency is told.
    expect(villa.listing?.title).toMatch(/Villa in Varna/);
    expect(villa.issues.some((i) => i.code === 'title_derived')).toBe(true);
    expect(flat.listing).toMatchObject({ externalId: 'KY-2', listingType: 'rent', price: 600 });
  });

  it('recognises Trovit, reads attributes and converts BGN at the fixed euro rate', () => {
    const header = readXmlDocument(TROVIT, 'listing').header!;
    expect(resolveFormat(header)).toMatchObject({ profileId: 'trovit' });
    const [ad] = read(TROVIT, profile('trovit'));
    expect(ad.listing).toMatchObject({ externalId: 'TR-7', title: 'Bright flat near the park', listingType: 'sale', propertyType: 'apartment', city: 'Plovdiv', sqft: 72 });
    expect(ad.listing?.price).toBeCloseTo(100000, 0);
    expect(ad.issues.some((i) => i.code === 'currency_converted')).toBe(true);
  });

  it('detects a layout no profile knows', () => {
    const header = readXmlDocument(UNKNOWN, 'listing').header!;
    const resolved = resolveFormat(header);
    expect(resolved).toMatchObject({ source: 'detected', label: '<offer>' });
    const results = read(UNKNOWN, resolved!.mapping);
    expect(results.map((r) => r.listing?.externalId)).toEqual(['EA-1', 'EA-2']);
    expect(results[0].listing).toMatchObject({ title: 'Apartment in Skopje', listingType: 'sale', sqft: 60 });
  });

  it('finds the listing element in a file with a single listing', () => {
    const single = UNKNOWN.replace(/<Offer><OfferId>EA-2[\s\S]*?<\/Offer>/, '');
    expect(resolveFormat(readXmlDocument(single, 'listing').header!)).toMatchObject({ label: '<offer>' });
  });
});

describe('field paths and catalog', () => {
  const [record] = readXmlDocument(KYERO, 'property').records;

  it('supports wildcards and attribute predicates', () => {
    expect(selectValues(record, 'desc/*')).toHaveLength(2);
    expect(selectValues(record, 'images/image[@id=2]/url')).toEqual(['https://agency.example/ky-1/2.jpg']);
  });

  it('lists every element with an example value', () => {
    const catalog = buildFieldCatalog(readXmlDocument(KYERO, 'property').records);
    const byPath = new Map(catalog.map((e) => [e.path, e]));
    expect(byPath.get('town')).toMatchObject({ sample: 'Varna', seenIn: 2 });
    expect(byPath.get('features/feature')).toMatchObject({ repeated: true });
    expect(byPath.get('images/image/@id')).toMatchObject({ sample: '1' });
  });
});

// ── Auto format through the real pipeline ──────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/agency-dashboard', require('../routes/agencyFeedRoutes').default);
const tokenFor = (user: { _id: unknown }) => `Bearer ${jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET as string, { expiresIn: '1h' })}`;
const feedsPath = (s: AgencySetup) => `/api/agency-dashboard/${s.agency._id}/feeds`;
const world = createWorld();
const drain = async () => {
  for (let i = 0; i < 5; i++) {
    const job = await claimNextJob('formats-test', new Date(Date.now() + 1000));
    if (!job) return;
    await processJob(job, 'formats-test', world.deps);
    world.advance(60 * 60 * 1000);
  }
};
const uploadPreview = async (s: AgencySetup, feedId: string, xml: string) => {
  const res = await request(app).post(`${feedsPath(s)}/${feedId}/upload`).set('Authorization', tokenFor(s.owner))
    .attach('file', Buffer.from(xml), { filename: 'feed.xml', contentType: 'application/xml' });
  expect(res.status).toBe(202);
  await drain();
  return (await request(app).get(`${feedsPath(s)}/${feedId}/runs/${res.body.runId}`).set('Authorization', tokenFor(s.owner))).body.run;
};

describe('auto format', () => {
  it('is the default, recognises a Kyero file, remembers it, and reports the fields it found', async () => {
    const s = await createAgencySetup();
    const created = await request(app).post(feedsPath(s)).set('Authorization', tokenFor(s.owner))
      .send({ name: 'Portal export', sourceType: 'upload', assignedAgentId: String(s.agent._id) });
    expect(created.status).toBe(201);
    expect(created.body.feed.format).toBe('auto');
    const feedId = created.body.feed.id;

    const run = await uploadPreview(s, feedId, KYERO);
    expect(run).toMatchObject({ status: 'previewed', counts: { received: 2, valid: 2 }, mappingUsed: { source: 'profile', label: 'Kyero' } });
    expect(run.fieldCatalog.map((e: { path: string }) => e.path)).toEqual(expect.arrayContaining(['id', 'town', 'surface_area/built']));

    const feed = await AgencyFeed.findById(feedId);
    expect(feed?.autoFormatLabel).toBe('Kyero');
    expect(feed?.autoMapping?.recordElement).toBe('property');

    // Next import uses the remembered mapping straight away.
    const again = await uploadPreview(s, feedId, KYERO);
    expect(again.mappingUsed).toMatchObject({ source: 'remembered', label: 'Kyero' });

    // A file in another format is recognised afresh.
    const canonical = await uploadPreview(s, feedId, feedXml([{ id: 'C-1' }]));
    expect(canonical.counts.valid).toBe(1);
    expect(canonical.mappingUsed).toMatchObject({ source: 'profile', label: 'BalkanEstateAI XML' });
  });

  it('an explicit canonical feed does not guess, and lists the fields of the unrecognised file', async () => {
    const s = await createAgencySetup();
    const created = await request(app).post(feedsPath(s)).set('Authorization', tokenFor(s.owner))
      .send({ name: 'Strict', sourceType: 'upload', format: 'canonical', assignedAgentId: String(s.agent._id) });
    const run = await uploadPreview(s, created.body.feed.id, UNKNOWN);
    expect(run.counts.received).toBe(0);
    expect(run.detected.recordElement).toBe('offer');
    expect(run.fieldCatalog.map((e: { path: string }) => e.path)).toEqual(expect.arrayContaining(['offerid', 'photos/photo', 'description']));
    expect(await AgencyFeedRun.countDocuments({ feedId: created.body.feed.id })).toBe(1);
  });
});
