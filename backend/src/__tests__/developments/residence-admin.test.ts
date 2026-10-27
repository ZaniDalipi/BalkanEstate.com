/** Admin controls for residences: list, building limit, grants, agency extras. */
import Development from '../../models/Development';
import express from 'express';
import request from 'supertest';
import Agency from '../../models/Agency';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import { makeUser, setupDevelopment, tokenFor } from './helpers/explorerHarness';

const app = express();
app.use(express.json());
// eslint-disable-next-line @typescript-eslint/no-var-requires
app.use('/api/admin', require('../../routes/adminRoutes').default);
const DAY = 86_400_000;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const adminToken = async () => tokenFor((await makeUser({ role: 'admin' }))._id);

describe('admin residences', () => {
  it('is admin-only', async () => {
    const user = await makeUser();
    expect((await request(app).get('/api/admin/residences').set(auth(tokenFor(user._id)))).status).toBe(403);
  });

  it('lists residences with their plan, filterable and searchable', async () => {
    const t = await setupDevelopment({ published: true, name: 'Searchable Heights' });
    const token = await adminToken();
    const res = await request(app).get('/api/admin/residences?search=searchable&filter=trial').set(auth(token));
    expect(res.status).toBe(200);
    const row = res.body.items.find((i: { slug: string }) => i.slug === t.dev.slug);
    expect(row).toMatchObject({ state: 'trial', publicNow: true, buildings: { used: 1, limit: 5, adminLimit: null } });
    const drafts = await request(app).get('/api/admin/residences?filter=draft&search=searchable').set(auth(token));
    expect(drafts.body.items.map((i: { slug: string }) => i.slug)).not.toContain(t.dev.slug);
  });

  it('sets a building limit, refuses one below the buildings it has, and can clear it', async () => {
    const t = await setupDevelopment({ published: true });
    const token = await adminToken();
    const patch = (limit: unknown) => request(app).patch(`/api/admin/residences/${t.devEnc}/building-limit`).set(auth(token)).send({ limit });
    expect((await patch(8)).body).toEqual({ limit: 8, used: 1 });
    expect((await patch(0)).status).toBe(400);
    expect((await patch(201)).status).toBe(400);
    expect((await patch(2.5)).status).toBe(400);
    expect((await patch(null)).body).toEqual({ limit: null, used: 1 });
  });

  it('grants a pass', async () => {
    const t = await setupDevelopment({ published: true });
    const token = await adminToken();
    const res = await request(app).post(`/api/admin/residences/${t.devEnc}/grant`).set(auth(token)).send({ months: 12, note: 'partner' });
    expect(res.status).toBe(201);
    const list = await request(app).get(`/api/admin/residences?filter=pass&search=${encodeURIComponent(t.dev.name)}`).set(auth(token));
    expect(list.body.items[0]).toMatchObject({ slug: t.dev.slug, state: 'active' });
  });

  it("shows and raises an agency's free residences for the year", async () => {
    const owner = await makeUser();
    const agency = await Agency.create({
      name: 'Allowance Agency', slug: `allow-${Date.now()}`, email: `allow-${Date.now()}@t.com`, phone: '+38269000001', city: 'Budva', country: 'Montenegro', ownerId: owner._id,
      subscription: { status: 'active', startDate: new Date(Date.now() - 10 * DAY), expiresAt: new Date(Date.now() + 300 * DAY), amount: 1000, currency: 'EUR', autoRenew: false },
    });
    const token = await adminToken();
    const url = `/api/admin/agencies/${agency._id}/residence-allowance`;
    expect((await request(app).get(url).set(auth(token))).body.allowance).toMatchObject({ subscribed: true, perYear: 1, extra: 0, used: 0, allowed: 1, left: 1 });
    expect((await request(app).post(url).set(auth(token)).send({ extra: 0 })).status).toBe(400);
    const raised = await request(app).post(url).set(auth(token)).send({ extra: 2, note: 'big developer' });
    expect(raised.status).toBe(201);
    expect(raised.body.allowance).toMatchObject({ extra: 2, allowed: 3, left: 3 });

    await Agency.updateOne({ _id: agency._id }, { $set: { 'subscription.status': 'expired', 'subscription.expiresAt': new Date(Date.now() - DAY) } });
    const refused = await request(app).post(url).set(auth(token)).send({ extra: 1 });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('AGENCY_NOT_SUBSCRIBED');
  });

  it('every refusal carries a code and the field it belongs to', async () => {
    const t = await setupDevelopment({ published: true });
    const token = await adminToken();
    const limit = (value: unknown) => request(app).patch(`/api/admin/residences/${t.devEnc}/building-limit`).set(auth(token)).send({ limit: value });
    expect((await limit(0)).body).toMatchObject({ code: 'FIELD_RANGE', details: { field: 'limit', params: { min: 1, max: 200 } } });
    await DevelopmentBuilding.create({ developmentId: t.devId, name: 'Block B', slug: `b-${Date.now()}` });
    expect((await limit(1)).body).toMatchObject({ code: 'LIMIT_BELOW_USED', details: { field: 'limit', params: { used: 2 } } });
    // A deleted residence is as good as gone for the admin actions too.
    const gone = await setupDevelopment({ published: true });
    await Development.updateOne({ _id: gone.devId }, { $set: { deletedAt: new Date() } });
    expect((await request(app).patch(`/api/admin/residences/${gone.devEnc}/building-limit`).set(auth(token)).send({ limit: 5 })).body.code).toBe('RESIDENCE_NOT_FOUND');
    expect((await request(app).post(`/api/admin/residences/${gone.devEnc}/grant`).set(auth(token)).send({ months: 1 })).body.code).toBe('RESIDENCE_NOT_FOUND');
    const ghost = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    expect((await request(app).patch(`/api/admin/residences/${ghost}/building-limit`).set(auth(token)).send({ limit: 5 })).body.code).toBe('RESIDENCE_NOT_FOUND');

    const grant = (body: Record<string, unknown>, id = t.devEnc) => request(app).post(`/api/admin/residences/${id}/grant`).set(auth(token)).send(body);
    expect((await grant({ months: 121 })).body).toMatchObject({ code: 'FIELD_RANGE', details: { field: 'months' } });
    expect((await grant({ months: 0 })).body).toMatchObject({ code: 'GRANT_EMPTY', details: { field: 'months' } });
    expect((await grant({ months: 1 }, ghost)).body.code).toBe('RESIDENCE_NOT_FOUND');

    const agency = await Agency.create({
      name: 'Coded Agency', slug: `coded-${Date.now()}`, email: `coded-${Date.now()}@test.com`, phone: '+38269000000', city: 'Budva', country: 'Montenegro',
      ownerId: (await makeUser())._id, subscription: { status: 'expired', startDate: new Date(Date.now() - 400 * DAY), expiresAt: new Date(Date.now() - DAY) },
    });
    const extra = (body: Record<string, unknown>, id = String(agency._id)) =>
      request(app).post(`/api/admin/agencies/${id}/residence-allowance`).set(auth(token)).send(body);
    expect((await extra({ extra: 21 })).body).toMatchObject({ code: 'FIELD_RANGE', details: { field: 'extra', params: { min: 1, max: 20 } } });
    const lapsed = await extra({ extra: 1 });
    expect(lapsed.status).toBe(409);
    expect(lapsed.body.code).toBe('AGENCY_NOT_SUBSCRIBED');
    expect((await request(app).get(`/api/admin/agencies/${ghost}/residence-allowance`).set(auth(token))).body.code).toBe('AGENCY_NOT_FOUND');
  });
});
