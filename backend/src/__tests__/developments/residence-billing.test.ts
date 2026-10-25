/**
 * Residence Pass over HTTP: free to create, the first publish starts a 15-day
 * trial, the residence drops out of public pages when it ends, a pass (100%
 * code or admin grant) brings it back, and the 5-building limit holds on
 * every path that creates buildings.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import Development from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DiscountCode from '../../models/DiscountCode';
import Notification from '../../models/Notification';
import { RESIDENCE_PRODUCTS } from '../../config/residenceBilling';
import { runResidenceBillingJob } from '../../services/developments/billing/residenceBillingJob';
import { buildApp, setupDevelopment, addMember, makeUser, tokenFor } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const PUB = '/api/developments';
const DAY = 86_400_000;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Move a residence's trial `days` into the past, as if that much time had gone by. */
const ageTrial = async (devId: unknown, days: number) => {
  const dev = await Development.findById(devId);
  const shift = (d?: Date) => (d ? new Date(d.getTime() - days * DAY) : d);
  await Development.updateOne(
    { _id: devId },
    {
      $set: {
        'billing.trialStartedAt': shift(dev!.billing.trialStartedAt),
        'billing.trialEndsAt': shift(dev!.billing.trialEndsAt),
        visibleUntil: shift(dev!.visibleUntil),
      },
    }
  );
};

const makeCode = (code: string, applicablePlans: string[] = [RESIDENCE_PRODUCTS.pass]) =>
  DiscountCode.create({
    code,
    discountType: 'percentage',
    discountValue: 100,
    validFrom: new Date(Date.now() - DAY),
    validUntil: new Date(Date.now() + 30 * DAY),
    usageLimit: 1,
    applicablePlans,
    createdBy: new mongoose.Types.ObjectId(),
    isActive: true,
  });

describe('creating and the free trial', () => {
  it('anyone signed in can create a residence (no subscription needed)', async () => {
    const user = await makeUser();
    const res = await request(app)
      .post(DASH)
      .set(auth(tokenFor(user._id)))
      .send({ name: 'Free Draft', country: 'Albania', city: 'Tirana', category: 'apartment_building' });
    expect(res.status).toBe(201);
  });

  it('the first publish starts a 15-day trial and makes it public', async () => {
    const t = await setupDevelopment();
    const pub = await request(app).post(`${DASH}/${t.devEnc}/publish`).set(auth(t.ownerToken)).send({});
    expect(pub.status).toBe(200);
    const billing = (await request(app).get(`${DASH}/${t.devEnc}/billing`).set(auth(t.ownerToken))).body.billing;
    expect(billing).toMatchObject({ state: 'trial', publicNow: true, daysLeft: 15, buildings: { used: 1, limit: 5 } });
    expect((await request(app).get(`${PUB}/${t.dev.slug}`)).status).toBe(200);
  });

  it('unpublishing and republishing does not restart the trial', async () => {
    const t = await setupDevelopment({ published: true });
    const first = (await Development.findById(t.devId))!.billing.trialEndsAt!.getTime();
    await request(app).post(`${DASH}/${t.devEnc}/publish`).set(auth(t.ownerToken)).send({ status: 'draft' });
    await request(app).post(`${DASH}/${t.devEnc}/publish`).set(auth(t.ownerToken)).send({});
    expect((await Development.findById(t.devId))!.billing.trialEndsAt!.getTime()).toBe(first);
  });

  it('public payloads never show billing', async () => {
    const t = await setupDevelopment({ published: true });
    const res = await request(app).get(`${PUB}/${t.dev.slug}`);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('billing');
    expect(body).not.toContain('visibleUntil');
  });
});

describe('after the trial', () => {
  it('drops out of every public page but stays in the dashboard', async () => {
    const t = await setupDevelopment({ published: true });
    await Development.updateOne({ _id: t.devId }, { $set: { lat: 42.28, lng: 18.84 } });
    await ageTrial(t.devId, 16);
    const viewer = await makeUser();
    expect((await request(app).get(`${PUB}/${t.dev.slug}`)).status).toBe(404);
    expect((await request(app).get(`${PUB}/${t.dev.slug}/units`)).status).toBe(404);
    const list = await request(app).get(PUB);
    expect(list.body.developments.map((d: { slug: string }) => d.slug)).not.toContain(t.dev.slug);
    const near = await request(app).get(`${PUB}/nearby?lat=42.28&lng=18.84`).set(auth(tokenFor(viewer._id)));
    expect(near.body.suggestions.map((s: { development: { slug: string } }) => s.development.slug)).not.toContain(t.dev.slug);
    expect((await request(app).get(`${DASH}/${t.devEnc}`).set(auth(t.ownerToken))).status).toBe(200);
  });

  it('republishing needs a pass', async () => {
    const t = await setupDevelopment({ published: true });
    await request(app).post(`${DASH}/${t.devEnc}/publish`).set(auth(t.ownerToken)).send({ status: 'draft' });
    await ageTrial(t.devId, 16);
    const res = await request(app).post(`${DASH}/${t.devEnc}/publish`).set(auth(t.ownerToken)).send({});
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('PASS_REQUIRED');
  });
});

describe('buying a pass', () => {
  it('without online payment, checkout says so and quotes the price', async () => {
    const t = await setupDevelopment({ published: true });
    const res = await request(app).post(`${DASH}/${t.devEnc}/billing/checkout`).set(auth(t.ownerToken)).send({ kind: 'pass' });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ code: 'PAYMENT_NOT_CONFIGURED', details: { amount: 149 } });
  });

  it('a residence code covering the full price brings it back for 12 months, once', async () => {
    const t = await setupDevelopment({ published: true });
    await ageTrial(t.devId, 16);
    await makeCode('RES100');
    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/billing/checkout`)
      .set(auth(t.ownerToken))
      .send({ kind: 'pass', couponCode: 'res100' });
    expect(res.status).toBe(201);
    expect(res.body.billing).toMatchObject({ state: 'active', publicNow: true });
    expect(res.body.billing.daysLeft).toBeGreaterThanOrEqual(364);
    expect((await request(app).get(`${PUB}/${t.dev.slug}`)).status).toBe(200);
    const again = await request(app)
      .post(`${DASH}/${t.devEnc}/billing/checkout`)
      .set(auth(t.ownerToken))
      .send({ kind: 'pass', couponCode: 'RES100' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('COUPON_INVALID');
  });

  it('general subscription codes do not unlock residences', async () => {
    const t = await setupDevelopment({ published: true });
    await makeCode('ANYPLAN', []);
    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/billing/checkout`)
      .set(auth(t.ownerToken))
      .send({ kind: 'pass', couponCode: 'ANYPLAN' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('COUPON_INVALID');
  });

  it('only the owner can buy; team members cannot', async () => {
    const t = await setupDevelopment({ published: true });
    const editor = await addMember(t.devId, 'manager');
    const res = await request(app).post(`${DASH}/${t.devEnc}/billing/checkout`).set(auth(editor.token)).send({ kind: 'pass' });
    expect(res.status).toBe(403);
  });

  it('validates the order', async () => {
    const t = await setupDevelopment({ published: true });
    const post = (body: object) => request(app).post(`${DASH}/${t.devEnc}/billing/checkout`).set(auth(t.ownerToken)).send(body);
    expect((await post({ kind: 'castle' })).status).toBe(400);
    expect((await post({ kind: 'extra_building', quantity: 0 })).status).toBe(400);
    expect((await post({ kind: 'extra_building', quantity: 2.5 })).status).toBe(400);
  });
});

describe('building limit', () => {
  it('allows 5 buildings, then asks to unlock more; extras need a pass', async () => {
    const t = await setupDevelopment({ published: true });
    const add = (name: string) => request(app).post(`${DASH}/${t.devEnc}/buildings`).set(auth(t.ownerToken)).send({ name });
    for (const n of ['B', 'C', 'D', 'E']) expect((await add(n)).status).toBe(201);
    const sixth = await add('F');
    expect(sixth.status).toBe(402);
    expect(sixth.body).toMatchObject({ code: 'BUILDING_LIMIT', details: { limit: 5, current: 5, allowed: 0 } });

    const extra = await request(app)
      .post(`${DASH}/${t.devEnc}/billing/checkout`)
      .set(auth(t.ownerToken))
      .send({ kind: 'extra_building', quantity: 1 });
    expect(extra.status).toBe(402);
    expect(extra.body.code).toBe('PASS_REQUIRED');

    const admin = await makeUser({ role: 'admin' });
    const granted = await request(app)
      .post(`${DASH}/${t.devEnc}/billing/grant`)
      .set(auth(tokenFor(admin._id)))
      .send({ months: 12, extraBuildings: 1, note: 'launch partner' });
    expect(granted.status).toBe(201);
    expect(granted.body.billing.buildings).toMatchObject({ limit: 6, extra: 1 });
    expect((await add('F')).status).toBe(201);
    expect((await add('G')).status).toBe(402);
  });

  it('only platform admins can grant', async () => {
    const t = await setupDevelopment({ published: true });
    const res = await request(app).post(`${DASH}/${t.devEnc}/billing/grant`).set(auth(t.ownerToken)).send({ months: 12 });
    expect(res.status).toBe(403);
  });

  it('an import with too many new buildings is refused before anything is written; the preview says why', async () => {
    const t = await setupDevelopment({ published: true });
    const rows = ['N1', 'N2', 'N3', 'N4', 'N5'].map((b, i) => ({ row: i + 2, building: b, level: 1, unitNumber: `${b}-1`, fields: {} }));
    const post = (body: object) => request(app).post(`${DASH}/${t.devEnc}/units/import`).set(auth(t.ownerToken)).send(body);
    const preview = await post({ rows, dryRun: true });
    expect(preview.status).toBe(200);
    expect(preview.body.buildingLimit).toEqual({ limit: 5, current: 1, allowed: 4 });
    const real = await post({ rows });
    expect(real.status).toBe(402);
    expect(real.body.code).toBe('BUILDING_LIMIT');
    expect(await DevelopmentBuilding.countDocuments({ developmentId: t.devId })).toBe(1);
  });
});

describe('trial guard and premium plans', () => {
  it('one residence on trial at a time', async () => {
    const t = await setupDevelopment({ published: true });
    const second = await request(app)
      .post(DASH)
      .set(auth(t.ownerToken))
      .send({ name: 'Second', country: 'Albania', city: 'Durres', category: 'apartment_building' });
    const res = await request(app).post(`${DASH}/${second.body.development.id}/publish`).set(auth(t.ownerToken)).send({});
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('TRIAL_IN_PROGRESS');
  });

  it('a Pro plan includes one residence without a trial; the next one gets a trial', async () => {
    const owner = await makeUser({
      isSubscribed: true,
      subscriptionExpiresAt: new Date(Date.now() + 60 * DAY),
      subscription: { tier: 'pro', status: 'active' },
    });
    const token = tokenFor(owner._id);
    const create = (name: string) =>
      request(app).post(DASH).set(auth(token)).send({ name, country: 'Albania', city: 'Tirana', category: 'apartment_building' });
    const a = (await create('Pro One')).body.development.id;
    const b = (await create('Pro Two')).body.development.id;
    await request(app).post(`${DASH}/${a}/publish`).set(auth(token)).send({});
    const ba = (await request(app).get(`${DASH}/${a}/billing`).set(auth(token))).body.billing;
    expect(ba).toMatchObject({ state: 'included', publicNow: true, trialStartedAt: null, premium: true });
    expect(ba.prices.pass).toMatchObject({ amount: 104.3, discountPct: 30 });
    await request(app).post(`${DASH}/${b}/publish`).set(auth(token)).send({});
    const bb = (await request(app).get(`${DASH}/${b}/billing`).set(auth(token))).body.billing;
    expect(bb.state).toBe('trial');
  });
});

describe('daily job', () => {
  it('sends each trial reminder once, then the offline notice', async () => {
    const t = await setupDevelopment({ published: true });
    await ageTrial(t.devId, 10);
    await runResidenceBillingJob();
    await runResidenceBillingJob();
    const day10 = await Notification.find({ userId: t.owner._id, type: 'residence_trial_reminder' });
    expect(day10).toHaveLength(1);
    await ageTrial(t.devId, 6);
    await runResidenceBillingJob();
    expect(await Notification.countDocuments({ userId: t.owner._id, type: 'residence_offline' })).toBe(1);
  });

  it('residences published before billing existed get a fresh trial instead of vanishing', async () => {
    const t = await setupDevelopment();
    await Development.updateOne({ _id: t.devId }, { $set: { status: 'published', publishedAt: new Date() } });
    expect((await request(app).get(`${PUB}/${t.dev.slug}`)).status).toBe(404);
    const r = await runResidenceBillingJob();
    expect(r.backfilled).toBeGreaterThanOrEqual(1);
    expect((await request(app).get(`${PUB}/${t.dev.slug}`)).status).toBe(200);
  });
});
