/**
 * Agency property feeds — HTTP API: ownership, manager permissions, unsafe
 * URLs, credential handling and the preview → authorize → activate gate.
 */
jest.mock('../utils/ssrfGuard', () => {
  const actual = jest.requireActual('../utils/ssrfGuard');
  // Test hosts under .example resolve to a public address; everything else
  // (IP literals, schemes, ports) goes through the real checks.
  const resolver = async (host: string) => {
    if (host.endsWith('.example')) return [{ address: '93.184.216.34', family: 4 }];
    if (host === 'internal.example.test') return [{ address: '10.0.0.5', family: 4 }];
    throw new Error('ENOTFOUND');
  };
  return { ...actual, resolvePublicUrl: (url: string) => actual.resolvePublicUrl(url, resolver) };
});
jest.mock('../jobs/propertyAlertsJob', () => ({
  ...jest.requireActual('../jobs/propertyAlertsJob'),
  processInstantPriceDropForProperty: jest.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import AgencyFeed from '../models/AgencyFeed';
import AgencyFeedAuditLog from '../models/AgencyFeedAuditLog';
import AgencyFeedJob from '../models/AgencyFeedJob';
import { decryptField } from '../utils/fieldEncryption';
import { claimNextJob, processJob } from '../services/agencyFeeds/feedJobQueue';
import { createAgencySetup, createWorld, feedXml, type AgencySetup } from './helpers/agencyFeedFixtures';

const app = express();
app.use(express.json());
app.use('/api/agency-dashboard', require('../routes/agencyFeedRoutes').default);

const tokenFor = (user: { _id: unknown }) => `Bearer ${jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET as string, { expiresIn: '1h' })}`;
const feedsPath = (s: AgencySetup) => `/api/agency-dashboard/${s.agency._id}/feeds`;

const drainOneJob = async (world: ReturnType<typeof createWorld>) => {
  const job = await claimNextJob('api-test', new Date(Date.now() + 1000));
  if (job) await processJob(job, 'api-test', world.deps);
};

describe('agency feed API — access control', () => {
  it('refuses users outside the agency and member agents who are not managers', async () => {
    const s = await createAgencySetup();
    expect((await request(app).get(feedsPath(s))).status).toBe(401);
    expect((await request(app).get(feedsPath(s)).set('Authorization', tokenFor(s.outsider))).status).toBe(403);
    const member = await request(app).get(feedsPath(s)).set('Authorization', tokenFor(s.agent));
    expect(member.status).toBe(403);
    expect(member.body.message).toContain('owner or an agency admin');
    expect((await request(app).get(feedsPath(s)).set('Authorization', tokenFor(s.owner))).status).toBe(200);
  });

  it("cannot reach another agency's feed, even with its ID", async () => {
    const a = await createAgencySetup();
    const b = await createAgencySetup();
    const res = await request(app).get(`${feedsPath(a)}/${b.feed._id}`).set('Authorization', tokenFor(a.owner));
    expect(res.status).toBe(404);
    const sync = await request(app).post(`${feedsPath(a)}/${b.feed._id}/sync`).set('Authorization', tokenFor(a.owner));
    expect(sync.status).toBe(404);
    expect(await AgencyFeedJob.countDocuments({})).toBe(0);
  });

  it('blocks agencies without an active subscription', async () => {
    const s = await createAgencySetup({ subscriptionStatus: 'expired' });
    expect((await request(app).get(feedsPath(s)).set('Authorization', tokenFor(s.owner))).status).toBe(403);
  });
});

describe('agency feed API — configuration', () => {
  it.each([
    ['http://169.254.169.254/latest/meta-data/'],
    ['http://127.0.0.1/feed.xml'],
    ['https://internal.example.test/feed.xml'],
    ['https://crm.example:8443/feed.xml'],
    ['file:///etc/passwd'],
  ])('refuses unsafe feed URL %s', async (url) => {
    const s = await createAgencySetup();
    const res = await request(app).post(feedsPath(s)).set('Authorization', tokenFor(s.owner)).send({ name: 'CRM', url });
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/cannot be used|not valid/);
  });

  it('stores credentials encrypted and never returns them', async () => {
    const s = await createAgencySetup();
    const res = await request(app)
      .post(feedsPath(s))
      .set('Authorization', tokenFor(s.owner))
      .send({ name: 'CRM', url: 'https://crm.example/export.xml?token=abc123', credentials: { type: 'basic', username: 'feed', secret: 'p@ss-w0rd' } });
    expect(res.status).toBe(201);
    expect(JSON.stringify(res.body)).not.toContain('p@ss-w0rd');
    expect(JSON.stringify(res.body)).not.toContain('abc123');
    expect(res.body.feed.credentials).toEqual({ type: 'basic', username: 'feed', hasSecret: true });
    expect(res.body.feed.state).toBe('draft');

    const stored = await AgencyFeed.findById(res.body.feed.id).lean();
    expect(stored?.credentials.secretEncrypted).not.toContain('p@ss-w0rd');
    expect(decryptField(stored!.credentials.secretEncrypted!)).toBe('p@ss-w0rd');
    const audit = await AgencyFeedAuditLog.find({ feedId: res.body.feed.id }).lean();
    expect(audit.map((a) => a.action)).toContain('feed_created');
    expect(JSON.stringify(audit)).not.toContain('p@ss-w0rd');
  });

  it('validates custom mappings and assigned agents', async () => {
    const s = await createAgencySetup();
    const res = await request(app)
      .post(feedsPath(s))
      .set('Authorization', tokenFor(s.owner))
      .send({ name: 'X', url: 'https://crm.example/x.xml', format: 'custom', mapping: { recordElement: 'p', fields: { title: 'a' } }, assignedAgentId: String(s.outsider._id) });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([expect.stringContaining('externalId'), expect.stringContaining('member of this agency')]));
  });

  it('sends an active feed back to draft when what it imports changes', async () => {
    const s = await createAgencySetup();
    const res = await request(app)
      .patch(`${feedsPath(s)}/${s.feed._id}`)
      .set('Authorization', tokenFor(s.owner))
      .send({ mode: 'delta' });
    expect(res.status).toBe(200);
    expect(res.body.feed).toMatchObject({ state: 'draft', mode: 'delta', configVersion: 2 });
    const renamed = await request(app).patch(`${feedsPath(s)}/${s.feed._id}`).set('Authorization', tokenFor(s.owner)).send({ name: 'Renamed' });
    expect(renamed.body.feed).toMatchObject({ name: 'Renamed', configVersion: 2 });
  });
});

describe('agency feed API — preview and activation', () => {
  const draftFeed = async (s: AgencySetup) => {
    await AgencyFeed.updateOne({ _id: s.feed._id }, { $set: { state: 'draft' } });
  };

  it('requires a successful preview and an authorization confirmation', async () => {
    const s = await createAgencySetup();
    await draftFeed(s);
    const world = createWorld();
    world.setFeed(feedXml([{ id: 'A-1' }, { id: 'A-2', omit: ['title'] }]));
    const auth = tokenFor(s.owner);

    expect((await request(app).post(`${feedsPath(s)}/${s.feed._id}/sync`).set('Authorization', auth)).body.code).toBe('not_active');
    const early = await request(app).post(`${feedsPath(s)}/${s.feed._id}/activate`).set('Authorization', auth).send({ confirmAuthorized: true });
    expect(early.body.code).toBe('preview_required');

    const preview = await request(app).post(`${feedsPath(s)}/${s.feed._id}/preview`).set('Authorization', auth);
    expect(preview.status).toBe(202);
    const again = await request(app).post(`${feedsPath(s)}/${s.feed._id}/preview`).set('Authorization', auth);
    expect(again.status).toBe(409);
    await drainOneJob(world);

    const run = await request(app).get(`${feedsPath(s)}/${s.feed._id}/runs/${preview.body.runId}`).set('Authorization', auth);
    expect(run.body.run).toMatchObject({ status: 'previewed', counts: { received: 2, valid: 1, rejected: 1 } });
    expect(run.body.run.samples[0].externalId).toBe('A-1');
    expect(run.body.run.issues[0]).toMatchObject({ code: 'missing_title', externalId: 'A-2' });

    const unconfirmed = await request(app).post(`${feedsPath(s)}/${s.feed._id}/activate`).set('Authorization', auth).send({});
    expect(unconfirmed.body.code).toBe('authorization_required');
    const activated = await request(app).post(`${feedsPath(s)}/${s.feed._id}/activate`).set('Authorization', auth).send({ confirmAuthorized: true });
    expect(activated.status).toBe(200);
    expect(activated.body.feed.state).toBe('active');
    expect(activated.body.feed.authorization.confirmedBy).toBe(String(s.owner._id));
    expect(await AgencyFeedJob.countDocuments({ feedId: s.feed._id, kind: 'sync', status: 'queued' })).toBe(1);
  });

  it('will not activate past the listing allowance without explicit acceptance', async () => {
    const s = await createAgencySetup({ monthlyAllowance: 1 });
    await draftFeed(s);
    const world = createWorld();
    world.setFeed(feedXml([{ id: 'A-1' }, { id: 'A-2' }, { id: 'A-3' }]));
    const auth = tokenFor(s.owner);
    await request(app).post(`${feedsPath(s)}/${s.feed._id}/preview`).set('Authorization', auth);
    await drainOneJob(world);

    const refused = await request(app).post(`${feedsPath(s)}/${s.feed._id}/activate`).set('Authorization', auth).send({ confirmAuthorized: true });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('listing_limit');
    expect(refused.body.message).toContain('3 new listings');

    const accepted = await request(app)
      .post(`${feedsPath(s)}/${s.feed._id}/activate`)
      .set('Authorization', auth)
      .send({ confirmAuthorized: true, acceptListingLimit: true });
    expect(accepted.status).toBe(200);
  });

  it('lists import history with counts and next sync time', async () => {
    const s = await createAgencySetup();
    const world = createWorld();
    world.setFeed(feedXml([{ id: 'A-1' }]));
    const auth = tokenFor(s.owner);
    await request(app).post(`${feedsPath(s)}/${s.feed._id}/sync`).set('Authorization', auth);
    await drainOneJob(world);
    const list = await request(app).get(feedsPath(s)).set('Authorization', auth);
    expect(list.body.feeds[0]).toMatchObject({ id: String(s.feed._id), lastSuccessfulSyncAt: expect.any(String), activeJob: false });
    const runs = await request(app).get(`${feedsPath(s)}/${s.feed._id}/runs`).set('Authorization', auth);
    expect(runs.body.runs[0]).toMatchObject({ trigger: 'manual', status: 'succeeded', counts: { created: 1 } });
  });
});
