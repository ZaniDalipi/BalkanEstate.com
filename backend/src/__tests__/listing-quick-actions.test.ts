/**
 * The quick actions on a "My listings" card (renew, move between private and
 * agency) change one or two fields. They must work on every stored listing,
 * including older ones that no longer pass today's full validation - a seller
 * can't be told "server error" for pressing Renew.
 */

import mongoose from 'mongoose';
import Property from '../models/Property';
import User from '../models/User';
import { renewProperty, reassignPropertyRole, markAsSold, markAsRented } from '../controllers/propertyController';

const sellerId = new mongoose.Types.ObjectId();
const strangerId = new mongoose.Types.ObjectId();

type Handler = (req: any, res: any) => Promise<void>;
const call = async (handler: Handler, id: mongoose.Types.ObjectId, body: Record<string, unknown> = {}, userId = sellerId) => {
  const req: any = { user: { _id: userId, id: String(userId) }, params: { id: String(id) }, body, query: {} };
  let json: any;
  let status = 200;
  const res: any = {
    status: (code: number) => { status = code; return res; },
    json: (data: any) => { json = data; return res; },
  };
  await handler(req, res);
  return { status, body: json };
};

/** A listing as older ones are stored: several fields today's schema requires are missing. */
const insertLegacy = async (extra: Record<string, unknown> = {}) => {
  const _id = new mongoose.Types.ObjectId();
  await Property.collection.insertOne({
    _id, sellerId, title: 'test', address: 'Ohrid', city: 'Ohrid', country: 'North Macedonia',
    price: 150, status: 'active', listingType: 'sale', createdAsRole: 'private_seller',
    createdAt: new Date(2026, 0, 1), ...extra,
  });
  return _id;
};

const stored = (id: mongoose.Types.ObjectId) => Property.collection.findOne({ _id: id });

beforeEach(async () => {
  await User.collection.insertOne({
    _id: sellerId, name: 'Seller', email: 'seller@example.com', role: 'agent',
    agencyName: 'Blue Agency', licenseNumber: 'L-1',
    subscription: { privateSellerCount: 1, agentCount: 0 },
  });
});

describe('renewProperty', () => {
  it('renews a listing that would not pass full validation', async () => {
    const id = await insertLegacy();
    const { status, body } = await call(renewProperty, id);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect((await stored(id))?.lastRenewed).toBeInstanceOf(Date);
  });

  it('answers 429 with the time left during the cooldown, and changes nothing', async () => {
    const lastRenewed = new Date(Date.now() - 90 * 60 * 1000);
    const id = await insertLegacy({ lastRenewed });
    const { status, body } = await call(renewProperty, id);
    expect(status).toBe(429);
    expect(body.code).toBe('RENEWAL_COOLDOWN');
    expect(body).toMatchObject({ hoursRemaining: 22, minutesRemaining: 30 });
    expect((await stored(id))?.lastRenewed).toEqual(lastRenewed);
  });

  it('lets only one of two simultaneous renews through', async () => {
    const id = await insertLegacy();
    const results = await Promise.all([call(renewProperty, id), call(renewProperty, id)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 429]);
  });

  it("refuses someone else's listing", async () => {
    const id = await insertLegacy();
    expect((await call(renewProperty, id, {}, strangerId)).status).toBe(403);
  });
});

describe('reassignPropertyRole', () => {
  it('moves a legacy listing to the agency and back, keeping the counters right', async () => {
    const id = await insertLegacy();

    const toAgency = await call(reassignPropertyRole, id, { role: 'agent' });
    expect(toAgency.status).toBe(200);
    expect(toAgency.body.property.createdAsRole).toBe('agent');
    expect(await stored(id)).toMatchObject({ createdAsRole: 'agent', createdByAgencyName: 'Blue Agency' });
    expect(toAgency.body.updatedSubscription).toMatchObject({ privateSellerCount: 0, agentCount: 1 });

    const toPrivate = await call(reassignPropertyRole, id, { role: 'private_seller' });
    expect(toPrivate.status).toBe(200);
    const after = await stored(id);
    expect(after?.createdAsRole).toBe('private_seller');
    expect(after?.createdByAgencyName).toBeUndefined();
    expect(toPrivate.body.updatedSubscription).toMatchObject({ privateSellerCount: 1, agentCount: 0 });
  });

  it('treats a repeat of the same move as done, not as an error', async () => {
    const id = await insertLegacy({ createdAsRole: 'agent' });
    const { status, body } = await call(reassignPropertyRole, id, { role: 'agent' });
    expect(status).toBe(200);
    expect(body.property.createdAsRole).toBe('agent');
    expect(body.unchanged).toBe(true);
  });

  it('rejects an unknown role and imported listings', async () => {
    const id = await insertLegacy();
    expect((await call(reassignPropertyRole, id, { role: 'admin' })).status).toBe(400);
    const imported = await insertLegacy({ createdAsRole: 'external' });
    expect((await call(reassignPropertyRole, imported, { role: 'agent' })).status).toBe(400);
  });
});

describe('markAsSold / markAsRented', () => {
  it('marks a legacy listing as sold', async () => {
    const id = await insertLegacy();
    const { status } = await call(markAsSold, id);
    expect(status).toBe(200);
    expect((await stored(id))?.status).toBe('sold');
  });

  it('marks a legacy rental as rented until a given date', async () => {
    const id = await insertLegacy({ listingType: 'rent' });
    const { status } = await call(markAsRented, id, { rentedUntil: '2027-03-01' });
    expect(status).toBe(200);
    const after = await stored(id);
    expect(after?.status).toBe('rented');
    expect(after?.rentedUntil).toEqual(new Date('2027-03-01'));
  });

  it('rejects an unreadable rented-until date and leaves the listing active', async () => {
    const id = await insertLegacy({ listingType: 'rent' });
    const { status, body } = await call(markAsRented, id, { rentedUntil: 'next spring' });
    expect(status).toBe(400);
    expect(body.code).toBe('INVALID_RENTED_UNTIL');
    expect((await stored(id))?.status).toBe('active');
  });
});
