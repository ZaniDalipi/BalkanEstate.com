/**
 * Agencies and residences: one free residence per subscription year while
 * subscribed, all earlier ones staying free; extras follow the normal trial
 * and pass; a 15-day grace after the subscription ends; admin extras and
 * building limits.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import Agency from '../../models/Agency';
import Development from '../../models/Development';
import Notification from '../../models/Notification';
import ResidencePurchase from '../../models/ResidencePurchase';
import { addAgencyExtra } from '../../services/developments/billing/agencyResidences';
import { recomputeAgencyResidences, recomputeBilling } from '../../services/developments/billing/residenceBillingService';
import { runResidenceBillingJob } from '../../services/developments/billing/residenceBillingJob';
import { grant } from '../../services/developments/billing/residencePurchaseService';
import { buildApp, makeUser, tokenFor } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const PUB = '/api/developments';
const DAY = 86_400_000;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
let seq = 0;

const makeAgency = async (subscription: Record<string, unknown> = {}) => {
  const owner = await makeUser();
  seq += 1;
  const agency = await Agency.create({
    name: `Agency ${seq}`,
    slug: `agency-${Date.now()}-${seq}`,
    email: `agency-${Date.now()}-${seq}@test.com`,
    phone: '+38269000000',
    city: 'Budva',
    country: 'Montenegro',
    ownerId: owner._id,
    subscription: {
      status: 'active',
      startDate: new Date(Date.now() - 30 * DAY),
      expiresAt: new Date(Date.now() + 300 * DAY),
      amount: 1000,
      currency: 'EUR',
      autoRenew: false,
      ...subscription,
    },
  });
  return { owner, token: tokenFor(owner._id), agency };
};

const setSub = (agencyId: unknown, sub: Record<string, unknown>) =>
  Agency.updateOne({ _id: agencyId }, { $set: Object.fromEntries(Object.entries(sub).map(([k, v]) => [`subscription.${k}`, v])) });

const create = async (token: string, name: string, extra: Record<string, unknown> = {}) => {
  const res = await request(app).post(DASH).set(auth(token)).send({ name, country: 'Montenegro', city: 'Budva', category: 'apartment_building', ...extra });
  return res.body.development as { id: string; slug: string; ownerType: string };
};
const publish = (token: string, id: string) => request(app).post(`${DASH}/${id}/publish`).set(auth(token)).send({});
const billing = async (token: string, id: string) => (await request(app).get(`${DASH}/${id}/billing`).set(auth(token))).body.billing;
const devBySlug = (slug: string) => Development.findOne({ slug });

describe('agency free residence', () => {
  it('an agency owner creates for the agency; the first publish is free, with no trial', async () => {
    const a = await makeAgency();
    const dev = await create(a.token, 'Agency One');
    expect(dev.ownerType).toBe('agency');
    const before = await billing(a.token, dev.id);
    expect(before.publish).toMatchObject({ allowed: true, startsTrial: false, usesAgencyFree: true });
    expect((await publish(a.token, dev.id)).status).toBe(200);
    const b = await billing(a.token, dev.id);
    expect(b).toMatchObject({ state: 'agency', publicNow: true, trialStartedAt: null, buildings: { limit: 5 } });
    expect((await request(app).get(`${PUB}/${dev.slug}`)).status).toBe(200);
  });

  it('a second one in the same year follows the normal trial', async () => {
    const a = await makeAgency();
    await publish(a.token, (await create(a.token, 'First')).id);
    const second = await create(a.token, 'Second');
    expect((await billing(a.token, second.id)).publish).toMatchObject({ allowed: true, startsTrial: true });
    await publish(a.token, second.id);
    expect((await billing(a.token, second.id)).state).toBe('trial');
  });

  it('two publishes at once: only one gets the free residence', async () => {
    const a = await makeAgency();
    const x = await create(a.token, 'X');
    const y = await create(a.token, 'Y');
    await Promise.all([publish(a.token, x.id), publish(a.token, y.id)]);
    const states = [(await billing(a.token, x.id)).state, (await billing(a.token, y.id)).state].sort();
    expect(states).toEqual(['agency', 'trial']);
  });

  it('a new subscription year brings one more, and the earlier one stays free', async () => {
    const a = await makeAgency({ startDate: new Date(Date.now() - 200 * DAY) });
    const first = await create(a.token, 'Year One');
    await publish(a.token, first.id);
    // The subscription renewed a year on: its year count moves on.
    await setSub(a.agency._id, { startDate: new Date(Date.now() - 400 * DAY), expiresAt: new Date(Date.now() + 330 * DAY) });
    const second = await create(a.token, 'Year Two');
    await publish(a.token, second.id);
    expect((await billing(a.token, second.id)).state).toBe('agency');
    await recomputeAgencyResidences(a.agency._id);
    expect((await billing(a.token, first.id)).state).toBe('agency');
  });

  it('after the subscription ends: 15 days of grace, then offline; renewing brings it back', async () => {
    const a = await makeAgency();
    const dev = await create(a.token, 'Lapsing');
    await publish(a.token, dev.id);

    await setSub(a.agency._id, { status: 'expired', expiresAt: new Date(Date.now() - 5 * DAY) });
    await recomputeAgencyResidences(a.agency._id);
    expect((await request(app).get(`${PUB}/${dev.slug}`)).status).toBe(200);
    expect((await billing(a.token, dev.id)).daysLeft).toBe(10);

    await setSub(a.agency._id, { expiresAt: new Date(Date.now() - 20 * DAY) });
    await Agency.updateOne({ _id: a.agency._id }, { $unset: { residenceEndedAt: 1 } });
    await recomputeAgencyResidences(a.agency._id);
    expect((await request(app).get(`${PUB}/${dev.slug}`)).status).toBe(404);
    expect((await billing(a.token, dev.id)).state).toBe('expired');

    await setSub(a.agency._id, { status: 'active', expiresAt: new Date(Date.now() + 365 * DAY) });
    await recomputeAgencyResidences(a.agency._id);
    expect((await request(app).get(`${PUB}/${dev.slug}`)).status).toBe(200);
  });

  it('cancelled early by an admin: the grace counts from when it was cancelled', async () => {
    const a = await makeAgency();
    const dev = await create(a.token, 'Cancelled');
    await publish(a.token, dev.id);
    await setSub(a.agency._id, { status: 'canceled' }); // end date still in the future
    await recomputeAgencyResidences(a.agency._id);
    expect((await billing(a.token, dev.id)).daysLeft).toBe(15);
    await Agency.updateOne({ _id: a.agency._id }, { $set: { residenceEndedAt: new Date(Date.now() - 16 * DAY) } });
    await recomputeAgencyResidences(a.agency._id);
    expect((await request(app).get(`${PUB}/${dev.slug}`)).status).toBe(404);
  });

  it('an admin can add free residences for the current year', async () => {
    const a = await makeAgency();
    await publish(a.token, (await create(a.token, 'One')).id);
    const admin = await makeUser({ role: 'admin' });
    expect(await addAgencyExtra(a.agency._id, 1, 'launch partner', admin._id, new Date())).toBe(true);
    const two = await create(a.token, 'Two');
    await publish(a.token, two.id);
    expect((await billing(a.token, two.id)).state).toBe('agency');
  });

  it('agents create their own residences, which follow the normal rules', async () => {
    const a = await makeAgency();
    const agent = await makeUser();
    await Agency.updateOne({ _id: a.agency._id }, { $push: { agents: agent._id } });
    const dev = await create(tokenFor(agent._id), 'Agent Own');
    expect(dev.ownerType).toBe('user');
    expect((await billing(tokenFor(agent._id), dev.id)).publish).toMatchObject({ startsTrial: true });
  });

  it('an owner can still make a personal residence', async () => {
    const a = await makeAgency();
    const dev = await create(a.token, 'Mine', { personal: true });
    expect(dev.ownerType).toBe('user');
  });

  it('an agency with no subscription gets the normal trial', async () => {
    const a = await makeAgency({ status: 'expired', expiresAt: new Date(Date.now() - DAY) });
    const dev = await create(a.token, 'No Plan');
    await publish(a.token, dev.id);
    expect((await billing(a.token, dev.id)).state).toBe('trial');
  });
});

describe('building limit and purchases', () => {
  it('an admin building limit wins over the 5 included', async () => {
    const a = await makeAgency();
    const dev = await create(a.token, 'Big');
    await publish(a.token, dev.id);
    const add = (n: string) => request(app).post(`${DASH}/${dev.id}/buildings`).set(auth(a.token)).send({ name: n });
    for (const n of ['A', 'B', 'C', 'D', 'E']) expect((await add(n)).status).toBe(201);
    expect((await add('F')).status).toBe(402);
    await Development.updateOne({ slug: dev.slug }, { $set: { 'billing.buildingLimit': 7 } });
    expect((await add('F')).status).toBe(201);
    expect((await billing(a.token, dev.id)).buildings).toMatchObject({ used: 6, limit: 7, adminLimit: 7 });
  });

  it('a refunded pass no longer counts', async () => {
    const owner = await makeUser();
    const token = tokenFor(owner._id);
    const dev = await create(token, 'Refund');
    const doc = (await devBySlug(dev.slug))!;
    const admin = new mongoose.Types.ObjectId();
    await grant(doc, admin, { months: 12 });
    expect((await billing(token, dev.id)).state).toBe('active');
    await ResidencePurchase.updateMany({ developmentId: doc._id }, { $set: { status: 'refunded' } });
    await recomputeBilling(doc._id as mongoose.Types.ObjectId);
    expect((await billing(token, dev.id)).state).not.toBe('active');
  });
});

describe('daily job: agency notices', () => {
  it('tells the agency once in the grace period, and once when offline', async () => {
    const a = await makeAgency();
    const dev = await create(a.token, 'Notice');
    await publish(a.token, dev.id);
    await setSub(a.agency._id, { status: 'expired', expiresAt: new Date(Date.now() - 2 * DAY) });
    await runResidenceBillingJob();
    await runResidenceBillingJob();
    expect(await Notification.countDocuments({ userId: a.owner._id, type: 'residence_agency_grace' })).toBe(1);
    await Agency.updateOne({ _id: a.agency._id }, { $set: { residenceEndedAt: new Date(Date.now() - 20 * DAY) } });
    await runResidenceBillingJob();
    expect(await Notification.countDocuments({ userId: a.owner._id, type: 'residence_offline' })).toBe(1);
    const n = await Notification.findOne({ userId: a.owner._id, type: 'residence_offline' }).lean();
    expect(String(n?.data?.actionUrl)).toMatch(/^\/dashboard\/developments\//);
  });
});
