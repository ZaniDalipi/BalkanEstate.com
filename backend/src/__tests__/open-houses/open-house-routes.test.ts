/**
 * Open house API: owner-only management, public RSVPs with capacity,
 * guest cancel by sign-up id, and the optional search filter.
 */
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createMockUser } from '../setup';
import '../../models/User';
import '../../models/Property';
import '../../models/OpenHouse';
import '../../models/Notification';

jest.mock('../../services/openHouse/openHouseEmails', () => ({
  sendOpenHouseRsvpConfirmation: jest.fn().mockResolvedValue(undefined),
  sendOpenHouseHostNotice: jest.fn().mockResolvedValue(undefined),
  sendOpenHouseCancelled: jest.fn().mockResolvedValue(undefined),
  sendOpenHouseReminder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/pushNotificationService', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}));

const app = (() => {
  const a = express();
  a.use(express.json());
  a.use('/api/open-houses', require('../../routes/openHouseRoutes').default);
  return a;
})();

const token = (id: string) => jwt.sign({ id }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1d' });

const DAY = 24 * 60 * 60 * 1000;
const windowIn = (days: number, hours = 2) => {
  const start = new Date(Date.now() + days * DAY);
  start.setUTCMinutes(0, 0, 0);
  return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + hours * 3600_000).toISOString() };
};

let seq = 0;
const makeUser = () => mongoose.model('User').create(createMockUser({ email: `u${++seq}-${Date.now()}@example.com` }));
const makeProperty = (sellerId: unknown) => mongoose.model('Property').create({
  sellerId, createdByName: 'Owner', createdByEmail: 'owner@example.com', createdAsRole: 'private_seller',
  listingType: 'sale', price: 100000, address: '1 Main St', city: 'Budva', country: 'Montenegro',
  beds: 2, baths: 1, livingRooms: 1, sqft: 70, yearBuilt: 2018, description: 'Nice flat',
  imageUrl: 'https://example.com/i.jpg', lat: 42.28, lng: 18.84, propertyType: 'apartment',
});

const setup = async () => {
  const owner = await makeUser();
  const property = await makeProperty(owner._id);
  return { owner, property, auth: `Bearer ${token(String(owner._id))}` };
};

describe('Open house API', () => {
  it('a listing has no open houses until its owner adds one', async () => {
    const { property } = await setup();
    const res = await request(app).get(`/api/open-houses/property/${property._id}`);
    expect(res.status).toBe(200);
    expect(res.body.openHouses).toEqual([]);
  });

  it('only the owner can add or cancel', async () => {
    const { property, auth } = await setup();
    const stranger = await makeUser();
    const body = { propertyId: String(property._id), ...windowIn(3) };

    await request(app).post('/api/open-houses').send(body).expect(401);
    const forbidden = await request(app).post('/api/open-houses')
      .set('Authorization', `Bearer ${token(String(stranger._id))}`).send(body);
    expect(forbidden.status).toBe(403);

    const created = await request(app).post('/api/open-houses').set('Authorization', auth).send(body);
    expect(created.status).toBe(201);
    const id = created.body.openHouse.id;

    await request(app).delete(`/api/open-houses/${id}`)
      .set('Authorization', `Bearer ${token(String(stranger._id))}`).expect(403);
    await request(app).delete(`/api/open-houses/${id}`).set('Authorization', auth).expect(200);
    const list = await request(app).get(`/api/open-houses/property/${property._id}`);
    expect(list.body.openHouses).toEqual([]);
  });

  it('explains a bad window next to the field', async () => {
    const { property, auth } = await setup();
    const res = await request(app).post('/api/open-houses').set('Authorization', auth)
      .send({ propertyId: String(property._id), ...windowIn(-1) });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toEqual({ field: 'openHouse', message: 'The open house must start in the future' });
  });

  it('takes guest RSVPs up to the cap, ignores repeats, and offers no spot when full', async () => {
    const { property, auth } = await setup();
    const created = await request(app).post('/api/open-houses').set('Authorization', auth)
      .send({ propertyId: String(property._id), ...windowIn(2), capacity: 1 });
    const id = created.body.openHouse.id;

    const first = await request(app).post(`/api/open-houses/${id}/rsvp`).send({ name: 'Ana', email: 'ana@example.com' });
    expect(first.status).toBe(201);
    expect(first.body.openHouse).toMatchObject({ isGoing: true, isFull: true, rsvpCount: 1 });
    expect(first.body.openHouse.myRsvpId).toBeTruthy();

    const again = await request(app).post(`/api/open-houses/${id}/rsvp`).send({ name: 'Ana', email: 'ANA@example.com' });
    expect(again.status).toBe(201);
    expect(again.body.openHouse.rsvpCount).toBe(1);

    const full = await request(app).post(`/api/open-houses/${id}/rsvp`).send({ name: 'Bo', email: 'bo@example.com' });
    expect(full.status).toBe(409);
    expect(full.body.message).toBe('This open house is full');

    // The public list never shows who is coming.
    const list = await request(app).get(`/api/open-houses/property/${property._id}`);
    expect(JSON.stringify(list.body)).not.toContain('ana@example.com');

    // The host does see it, and the owner was notified.
    const mine = await request(app).get('/api/open-houses/mine').set('Authorization', auth);
    expect(mine.body.openHouses[0].rsvps[0]).toMatchObject({ name: 'Ana', email: 'ana@example.com' });
    await new Promise((r) => setTimeout(r, 50));
    const notes = await mongoose.model('Notification').find({ type: 'open_house_rsvp' });
    expect(notes).toHaveLength(1);
  });

  it('validates the visitor details', async () => {
    const { property, auth } = await setup();
    const created = await request(app).post('/api/open-houses').set('Authorization', auth)
      .send({ propertyId: String(property._id), ...windowIn(2) });
    const res = await request(app).post(`/api/open-houses/${created.body.openHouse.id}/rsvp`).send({ name: 'Ana', email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Please enter a valid email address');
  });

  it('a guest cancels only with their own sign-up id', async () => {
    const { property, auth } = await setup();
    const created = await request(app).post('/api/open-houses').set('Authorization', auth)
      .send({ propertyId: String(property._id), ...windowIn(2) });
    const id = created.body.openHouse.id;
    const signed = await request(app).post(`/api/open-houses/${id}/rsvp`).send({ name: 'Ana', email: 'ana@example.com' });

    await request(app).delete(`/api/open-houses/${id}/rsvp`).send({ rsvpId: String(new mongoose.Types.ObjectId()) }).expect(200);
    let doc = await mongoose.model('OpenHouse').findById(id);
    expect(doc.rsvps).toHaveLength(1);

    await request(app).delete(`/api/open-houses/${id}/rsvp`).send({ rsvpId: signed.body.openHouse.myRsvpId }).expect(200);
    doc = await mongoose.model('OpenHouse').findById(id);
    expect(doc.rsvps).toHaveLength(0);
  });
});

describe('Open house service helpers for search', () => {
  it('lists only properties with an upcoming, scheduled open house', async () => {
    const { propertyIdsWithOpenHouseBetween, nextOpenHouseByProperty, insertDrafts } =
      require('../../services/openHouse/openHouseService');
    const OpenHouse = mongoose.model('OpenHouse');
    const { owner, property } = await setup();
    const other = await makeProperty(owner._id);
    const past = await makeProperty(owner._id);

    const soon = windowIn(1);
    const later = windowIn(4);
    await insertDrafts(String(property._id), String(owner._id), [
      { startsAt: new Date(later.startsAt), endsAt: new Date(later.endsAt) },
      { startsAt: new Date(soon.startsAt), endsAt: new Date(soon.endsAt) },
    ]);
    await OpenHouse.create({ propertyId: other._id, hostId: owner._id, ...windowIn(2), status: 'cancelled' });
    await OpenHouse.create({ propertyId: past._id, hostId: owner._id, startsAt: new Date(Date.now() - 3 * 3600_000), endsAt: new Date(Date.now() - 3600_000) });

    const ids = (await propertyIdsWithOpenHouseBetween(new Date(), new Date(Date.now() + 7 * 86_400_000))).map(String);
    expect(ids).toEqual([String(property._id)]);
    // The listing's own date for search and sorting follows its soonest open house.
    const fresh = await (await import('../../models/Property')).default.findById(property._id).lean();
    expect(fresh?.nextOpenHouseAt?.toISOString()).toBe(soon.startsAt);

    const next = await nextOpenHouseByProperty([String(property._id), String(other._id)]);
    expect(next.get(String(property._id))).toEqual(soon);
    expect(next.has(String(other._id))).toBe(false);
  });
});

describe('Optional open houses on listing creation', () => {
  const propertyApp = (() => {
    const a = express();
    a.use(express.json());
    a.use('/api/properties', require('../../routes/propertyRoutes').default);
    return a;
  })();

  it('rejects a bad open house date next to the field and creates nothing', async () => {
    const seller = await makeUser();
    const res = await request(propertyApp).post('/api/properties')
      .set('Authorization', `Bearer ${token(String(seller._id))}`)
      .send({ title: 'Flat', price: 1, openHouses: [windowIn(-2)] });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([{ field: 'openHouses', message: 'The open house must start in the future' }]);
    expect(await mongoose.model('Property').countDocuments()).toBe(0);
  });
});
