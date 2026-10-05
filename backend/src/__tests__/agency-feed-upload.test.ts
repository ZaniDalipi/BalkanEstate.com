/**
 * Agency property feeds — importing an uploaded XML file instead of a URL.
 * Same pipeline as fetched feeds: preview → authorize → activate imports the
 * previewed file; later uploads import directly with the same safeguards.
 */
jest.mock('../jobs/propertyAlertsJob', () => ({
  ...jest.requireActual('../jobs/propertyAlertsJob'),
  processInstantPriceDropForProperty: jest.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import AgencyFeed from '../models/AgencyFeed';
import AgencyFeedRun from '../models/AgencyFeedRun';
import Property from '../models/Property';
import { claimNextJob, processJob, scheduleDueFeeds } from '../services/agencyFeeds/feedJobQueue';
import { createAgencySetup, createWorld, feedXml, type AgencySetup, type TestListing } from './helpers/agencyFeedFixtures';

const app = express();
app.use(express.json());
app.use('/api/agency-dashboard', require('../routes/agencyFeedRoutes').default);

const tokenFor = (user: { _id: unknown }) => `Bearer ${jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET as string, { expiresIn: '1h' })}`;
const feedsPath = (s: AgencySetup) => `/api/agency-dashboard/${s.agency._id}/feeds`;
const ids = (n: number): TestListing[] => Array.from({ length: n }, (_, i) => ({ id: `UP-${i + 1}` }));

const world = createWorld();
const drain = async () => {
  for (let i = 0; i < 5; i++) {
    const job = await claimNextJob('upload-test', new Date(Date.now() + 1000));
    if (!job) return;
    await processJob(job, 'upload-test', world.deps);
    world.advance(60 * 60 * 1000);
  }
};

const createUploadFeed = async (s: AgencySetup) => {
  const res = await request(app)
    .post(feedsPath(s))
    .set('Authorization', tokenFor(s.owner))
    .send({ name: 'CRM export', sourceType: 'upload', assignedAgentId: String(s.agent._id) });
  expect(res.status).toBe(201);
  return res.body.feed as { id: string; sourceType: string; url: string | null; state: string };
};

const upload = (s: AgencySetup, feedId: string, xml: string | Buffer, filename = 'listings.xml', intent?: string) => {
  const req = request(app).post(`${feedsPath(s)}/${feedId}/upload`).set('Authorization', tokenFor(s.owner));
  if (intent) req.field('intent', intent);
  return req.attach('file', Buffer.isBuffer(xml) ? xml : Buffer.from(xml), { filename, contentType: 'application/xml' });
};

describe('agency feed — XML file upload', () => {
  it('creates an upload feed with no URL, previews the file, and activation imports that same file', async () => {
    const s = await createAgencySetup();
    const feed = await createUploadFeed(s);
    expect(feed).toMatchObject({ sourceType: 'upload', url: null, state: 'draft' });

    const res = await upload(s, feed.id, feedXml(ids(3)));
    expect(res.status).toBe(202);
    expect(res.body.kind).toBe('preview');
    await drain();
    const preview = await AgencyFeedRun.findById(res.body.runId);
    expect(preview).toMatchObject({ status: 'previewed', sourceFile: { filename: 'listings.xml' } });
    expect(preview?.counts.valid).toBe(3);
    expect(await Property.countDocuments({ 'feedSync.feedId': feed.id })).toBe(0);

    const activated = await request(app).post(`${feedsPath(s)}/${feed.id}/activate`).set('Authorization', tokenFor(s.owner)).send({ confirmAuthorized: true });
    expect(activated.status).toBe(200);
    expect(activated.body.feed.nextSyncAt).toBeNull();
    await drain();

    const run = await AgencyFeedRun.findById(activated.body.runId);
    expect(run).toMatchObject({ status: 'succeeded', counts: { created: 3 } });
    expect(String(run?.uploadId)).toBe(String(preview?.uploadId));
    expect(await Property.countDocuments({ 'feedSync.feedId': feed.id, status: 'active' })).toBe(3);
  });

  it('imports later uploads directly, deactivating what a complete file no longer lists', async () => {
    const s = await createAgencySetup();
    const feed = await createUploadFeed(s);
    await AgencyFeed.updateOne({ _id: feed.id }, { $set: { state: 'active' } });

    const first = await upload(s, feed.id, feedXml(ids(10)));
    expect(first.body.kind).toBe('sync');
    await drain();
    expect(await Property.countDocuments({ 'feedSync.feedId': feed.id, status: 'active' })).toBe(10);

    const res = await upload(s, feed.id, feedXml([...ids(9), { id: 'UP-1', price: 1 }].slice(1)));
    await drain();
    const run = await AgencyFeedRun.findById(res.body.runId);
    expect(run?.counts).toMatchObject({ updated: 1, deactivated: 1 });
    expect(await Property.findOne({ 'feedSync.externalId': 'UP-10' })).toMatchObject({ status: 'draft' });

    // A file that points to pages it does not contain is incomplete: no deactivation.
    const partial = await upload(s, feed.id, feedXml(ids(2), 'next-page="https://crm.example/p2.xml"'));
    await drain();
    const partialRun = await AgencyFeedRun.findById(partial.body.runId);
    expect(partialRun?.snapshot.complete).toBe(false);
    expect(partialRun?.deactivation.allowed).toBe(false);

    // Preview-only upload on an active feed changes nothing.
    const previewOnly = await upload(s, feed.id, feedXml(ids(1)), 'check.xml', 'preview');
    expect(previewOnly.body.kind).toBe('preview');
    await drain();
    expect(await Property.countDocuments({ 'feedSync.feedId': feed.id, status: 'active' })).toBe(9);
  });

  it('accepts the sample feed file', async () => {
    const s = await createAgencySetup();
    const feed = await createUploadFeed(s);
    const sample = fs.readFileSync(path.join(__dirname, '../../../docs/integrations/agency-feeds/sample-feed.xml'));
    const res = await upload(s, feed.id, sample, 'sample-feed.xml');
    await drain();
    expect((await AgencyFeedRun.findById(res.body.runId))?.counts).toMatchObject({ received: 4, valid: 4 });
  });

  it('rejects files that are not XML, unsafe XML, and uploads to the wrong kind of feed', async () => {
    const s = await createAgencySetup();
    const feed = await createUploadFeed(s);
    const auth = tokenFor(s.owner);

    const wrongExt = await upload(s, feed.id, feedXml(ids(1)), 'listings.csv');
    expect(wrongExt.status).toBe(400);
    expect(wrongExt.body.message).toContain('.xml');
    const notXml = await upload(s, feed.id, 'id,title\n1,flat', 'listings.xml');
    expect(notXml.status).toBe(400);
    expect(notXml.body.errors).toEqual(['The file is not XML']);
    expect((await request(app).post(`${feedsPath(s)}/${feed.id}/upload`).set('Authorization', auth)).status).toBe(400);

    const xxe = await upload(s, feed.id, '<?xml version="1.0"?><!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]><r><listing><id>&x;</id></listing></r>');
    expect(xxe.status).toBe(202);
    await drain();
    expect((await AgencyFeedRun.findById(xxe.body.runId))?.error?.code).toBe('doctype_forbidden');

    expect((await request(app).post(`${feedsPath(s)}/${feed.id}/sync`).set('Authorization', auth)).body.code).toBe('upload_required');
    expect((await request(app).post(`${feedsPath(s)}/${feed.id}/preview`).set('Authorization', auth)).body.code).toBe('upload_required');
    const toUrlFeed = await upload(s, String(s.feed._id), feedXml(ids(1)));
    expect(toUrlFeed.body.code).toBe('not_upload_feed');
  });

  it('only managers can upload, and URL feeds still need a URL', async () => {
    const s = await createAgencySetup();
    const feed = await createUploadFeed(s);
    const res = await request(app)
      .post(`${feedsPath(s)}/${feed.id}/upload`)
      .set('Authorization', tokenFor(s.agent))
      .attach('file', Buffer.from(feedXml(ids(1))), 'x.xml');
    expect(res.status).toBe(403);
    const noUrl = await request(app).post(feedsPath(s)).set('Authorization', tokenFor(s.owner)).send({ name: 'Site' });
    expect(noUrl.body.errors).toContain('Feed URL is required');
  });

  it('is never picked up by the daily scheduler', async () => {
    const s = await createAgencySetup();
    const feed = await createUploadFeed(s);
    await AgencyFeed.updateMany({}, { $set: { state: 'active', nextSyncAt: new Date(Date.now() - 1000) } });
    expect(await scheduleDueFeeds()).toBe(1); // only the URL feed from the fixture
    expect(await AgencyFeedRun.countDocuments({ feedId: feed.id })).toBe(0);
  });
});
