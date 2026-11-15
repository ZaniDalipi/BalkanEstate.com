/**
 * Open houses & auctions through the real routes: search filters and sort,
 * auction validation on edit, alerts to people who saved the home, reminders.
 */
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createMockUser } from '../setup';
import '../../models/User';
import PropertyModel from '../../models/Property';
import '../../models/OpenHouse';
import '../../models/Favorite';
import '../../models/Notification';

jest.mock('../../services/openHouse/openHouseEmails', () => {
  const actual = jest.requireActual('../../services/openHouse/openHouseEmails');
  return { ...actual, sendOpenHouseRsvpConfirmation: jest.fn(), sendOpenHouseHostNotice: jest.fn(), sendOpenHouseCancelled: jest.fn().mockResolvedValue(undefined), sendOpenHouseReminder: jest.fn() };
});
jest.mock('../../services/listingEvents/listingEventEmails', () => ({
  sendSavedHomeEventEmail: jest.fn().mockResolvedValue(undefined),
  sendAuctionReminderEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/pushNotificationService', () => ({ sendPushToUser: jest.fn().mockResolvedValue(undefined) }));

const app = (() => {
  const a = express();
  a.use(express.json());
  a.use('/api/properties', require('../../routes/propertyRoutes').default);
  a.use('/api/open-houses', require('../../routes/openHouseRoutes').default);
  return a;
})();

const token = (id: unknown) => `Bearer ${jwt.sign({ id: String(id) }, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1d' })}`;
const DAY = 86_400_000;
const inDays = (d: number) => { const t = new Date(Date.now() + d * DAY); t.setUTCMinutes(0, 0, 0); return t; };
const reload = async (id: unknown) => {
  const doc = await PropertyModel.findById(id).lean();
  if (!doc) throw new Error('property missing');
  return doc;
};
const flush = () => new Promise((r) => setTimeout(r, 80));

let seq = 0;
const makeUser = () => mongoose.model('User').create(createMockUser({ email: `e${++seq}-${Date.now()}@example.com` }));
const makeProperty = (sellerId: unknown, over: Record<string, unknown> = {}) => mongoose.model('Property').create({
  sellerId, createdByName: 'Owner', createdByEmail: 'owner@example.com', createdAsRole: 'private_seller',
  listingType: 'sale', price: 100000, address: '1 Main St', city: 'Budva', country: 'Montenegro',
  beds: 2, baths: 1, livingRooms: 1, sqft: 70, yearBuilt: 2018, description: 'Nice flat',
  imageUrl: 'https://example.com/i.jpg', lat: 42.28, lng: 18.84, propertyType: 'apartment', status: 'active', ...over,
});
const addOpenHouse = (auth: string, propertyId: unknown, startDays: number) =>
  request(app).post('/api/open-houses').set('Authorization', auth)
    .send({ propertyId: String(propertyId), startsAt: inDays(startDays).toISOString(), endsAt: new Date(inDays(startDays).getTime() + 2 * 3600_000).toISOString() });
const titles = (res: request.Response) => res.body.properties.map((p: { title?: string; city: string }) => p.title);

describe('search: open house and auction filters', () => {
  it('filters by an open house window, auctions, and sorts soonest first', async () => {
    const owner = await makeUser();
    const auth = token(owner._id);
    const plain = await makeProperty(owner._id, { title: 'Plain' });
    const ohSoon = await makeProperty(owner._id, { title: 'OH in 2 days' });
    const ohLater = await makeProperty(owner._id, { title: 'OH in 9 days' });
    const auction = await makeProperty(owner._id, { title: 'Auction in 4 days' });
    await addOpenHouse(auth, ohSoon._id, 2).expect(201);
    await addOpenHouse(auth, ohLater._id, 9).expect(201);
    await request(app).put(`/api/properties/${auction._id}`).set('Authorization', auth)
      .send({ auction: { startsAt: inDays(4).toISOString(), mode: 'in_person', location: 'Notary, Budva', startingPrice: 70000 } })
      .expect(200);

    const all = await request(app).get('/api/properties');
    expect(titles(all)).toEqual(expect.arrayContaining(['Plain', 'OH in 2 days', 'OH in 9 days', 'Auction in 4 days']));

    const anyOh = await request(app).get('/api/properties?hasOpenHouse=true');
    expect(titles(anyOh).sort()).toEqual(['OH in 2 days', 'OH in 9 days']);

    const window = await request(app).get(`/api/properties?openHouseFrom=${inDays(1).toISOString()}&openHouseTo=${inDays(3).toISOString()}`);
    expect(titles(window)).toEqual(['OH in 2 days']);

    const auctions = await request(app).get('/api/properties?hasAuction=true');
    expect(titles(auctions)).toEqual(['Auction in 4 days']);
    // Lists carry only the auction's essentials.
    expect(auctions.body.properties[0].auction).toEqual(expect.objectContaining({ mode: 'in_person', startingPrice: 70000 }));
    expect(auctions.body.properties[0].auction.location).toBeUndefined();
    expect(await request(app).get('/api/properties?auctionWithinDays=3').then(titles)).toEqual([]);

    const soonest = await request(app).get('/api/properties?sortBy=events-soonest');
    expect(titles(soonest)).toEqual(['OH in 2 days', 'Auction in 4 days', 'OH in 9 days']);
    expect(titles(soonest)).not.toContain(plain.title);

    // Garbage parameters are ignored, never an error.
    await request(app).get('/api/properties?openHouseFrom=nope&auctionWithinDays=abc').expect(200);
  });

  it('moves the listing on to its next open house when one is cancelled', async () => {
    const owner = await makeUser();
    const auth = token(owner._id);
    const p = await makeProperty(owner._id);
    const first = await addOpenHouse(auth, p._id, 2);
    await addOpenHouse(auth, p._id, 5);
    await request(app).delete(`/api/open-houses/${first.body.openHouse.id}`).set('Authorization', auth).expect(200);
    const fresh = await reload(p._id);
    expect(fresh.nextOpenHouseAt?.getTime()).toBe(inDays(5).getTime());
  });
});

describe('auction on a listing', () => {
  it('validates next to the field, keeps internals private, and can be removed', async () => {
    const owner = await makeUser();
    const auth = token(owner._id);
    const p = await makeProperty(owner._id);

    const bad = await request(app).put(`/api/properties/${p._id}`).set('Authorization', auth)
      .send({ auction: { startsAt: inDays(3).toISOString(), mode: 'online' } });
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toEqual([{ field: 'auction', message: 'Add the link where people can bid online' }]);

    const ok = await request(app).put(`/api/properties/${p._id}`).set('Authorization', auth)
      .send({ auction: { startsAt: inDays(3).toISOString(), mode: 'online', url: 'https://bank.example/a/1', reminderSentAt: new Date().toISOString() } });
    expect(ok.status).toBe(200);
    let doc = await reload(p._id);
    expect(doc.auction?.reminderSentAt).toBeUndefined();
    expect(doc.nextEventAt).toBeTruthy();

    const stranger = await makeUser();
    await request(app).put(`/api/properties/${p._id}`).set('Authorization', token(stranger._id))
      .send({ auction: null }).expect(403);

    await request(app).put(`/api/properties/${p._id}`).set('Authorization', auth).send({ auction: null }).expect(200);
    doc = await reload(p._id);
    expect(doc.auction).toBeUndefined();
    expect(doc.nextEventAt).toBeUndefined();
  });
});

describe('alerts to people who saved the home', () => {
  it('tells savers (alerts on, not the owner) once per new event, and reminds the day before', async () => {
    const { sendSavedHomeEventEmail, sendAuctionReminderEmail } = require('../../services/listingEvents/listingEventEmails');
    const owner = await makeUser();
    const saver = await makeUser();
    const muted = await makeUser();
    const auth = token(owner._id);
    const p = await makeProperty(owner._id);
    const Favorite = mongoose.model('Favorite');
    await Favorite.create({ userId: saver._id, propertyId: p._id, priceAtSave: 100000 });
    await Favorite.create({ userId: muted._id, propertyId: p._id, priceAtSave: 100000, priceAlertEnabled: false });
    await Favorite.create({ userId: owner._id, propertyId: p._id, priceAtSave: 100000 });

    await addOpenHouse(auth, p._id, 3).expect(201);
    const auction = { startsAt: new Date(Date.now() + 20 * 3600_000).toISOString(), mode: 'in_person', location: 'Notary' };
    await request(app).put(`/api/properties/${p._id}`).set('Authorization', auth).send({ auction }).expect(200);
    // Saving the same auction again is not news.
    await request(app).put(`/api/properties/${p._id}`).set('Authorization', auth).send({ auction }).expect(200);
    await flush();

    const Notification = mongoose.model('Notification');
    const notes = await Notification.find({}).lean();
    expect(notes.map((n) => [String(n.userId), n.type]).sort()).toEqual([
      [String(saver._id), 'saved_home_auction'],
      [String(saver._id), 'saved_home_open_house'],
    ].sort());
    expect(sendSavedHomeEventEmail).toHaveBeenCalledTimes(2);

    const { processListingEventReminders } = require('../../jobs/listingEventReminderJob');
    expect(await processListingEventReminders()).toBe(1);
    expect(await processListingEventReminders()).toBe(0);
    await flush();
    expect(sendAuctionReminderEmail).toHaveBeenCalledTimes(1);
    expect(await Notification.countDocuments({ type: 'auction_reminder', userId: saver._id })).toBe(1);
  });
});
