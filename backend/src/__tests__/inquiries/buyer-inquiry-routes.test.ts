/**
 * POST /api/inquiries/property and /agent through the real routes: the server
 * must hold the line even when the form is bypassed and the endpoint is called
 * straight from a console. The email service is mocked.
 */
import express from 'express';
import request from 'supertest';
import Inquiry from '../../models/Inquiry';
import { makeListing, makeUser, tokenFor } from '../developments/helpers/explorerHarness';

jest.mock('../../services/emailService', () => ({
  sendAgentInquiry: jest.fn(async () => undefined),
  sendEmail: jest.fn(async () => undefined),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const email = require('../../services/emailService');

const app = express();
app.use(express.json());
// eslint-disable-next-line @typescript-eslint/no-var-requires
app.use('/api/inquiries', require('../../routes/inquiryRoutes').default);

const buyer = { buyerName: 'Biao Test', buyerEmail: 'scripted@example.com', message: 'Is this still available?' };

const sendProperty = (propertyId: unknown, extra: Record<string, unknown> = {}) =>
  request(app).post('/api/inquiries/property').send({ ...buyer, propertyId: String(propertyId), ...extra });

describe('public buyer inquiries', () => {
  beforeEach(() => email.sendAgentInquiry.mockReset().mockResolvedValue(undefined));

  it('saves a valid inquiry with a normalised phone and a hashed IP, and emails the seller', async () => {
    const seller = await makeUser();
    const listing = await makeListing(seller._id, { status: 'active' });
    const res = await sendProperty(listing._id, { buyerPhone: '+382 67 123 456' });

    expect(res.status).toBe(200);
    const saved = await Inquiry.findOne({ propertyId: listing._id }).select('+senderIpHash').lean();
    expect(saved!.buyerPhone).toBe('+38267123456');
    expect(saved!.senderIpHash).toMatch(/^[0-9a-f]{32}$/);
    expect(email.sendAgentInquiry).toHaveBeenCalledTimes(1);
  });

  it('rejects a made-up phone number before anything is saved or emailed', async () => {
    const listing = await makeListing((await makeUser())._id, { status: 'active' });
    const res = await sendProperty(listing._id, { buyerPhone: '+134535624332' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'invalid_phone', field: 'buyerPhone' });
    expect(await Inquiry.countDocuments({ propertyId: listing._id })).toBe(0);
    expect(email.sendAgentInquiry).not.toHaveBeenCalled();
  });

  it('stops one email from rotating phone numbers across listings', async () => {
    const seller = await makeUser();
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => makeListing(seller._id, { status: 'active' })));

    expect((await sendProperty(a._id, { buyerPhone: '+38267111111' })).status).toBe(200);
    expect((await sendProperty(b._id, { buyerPhone: '+38267222222' })).status).toBe(200);
    const third = await sendProperty(c._id, { buyerPhone: '+38267333333' });

    expect(third.status).toBe(400);
    expect(third.body).toMatchObject({ code: 'phone_mismatch', field: 'buyerPhone' });
    expect(await Inquiry.countDocuments({ propertyId: c._id })).toBe(0);
  });

  it('refuses the same inquiry twice (409)', async () => {
    const listing = await makeListing((await makeUser())._id, { status: 'active' });
    const body = { buyerEmail: 'twice@example.com' };
    expect((await sendProperty(listing._id, body)).status).toBe(200);
    const again = await sendProperty(listing._id, body);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('duplicate_inquiry');
  });

  it('answers a filled honeypot with a fake success and saves nothing', async () => {
    const listing = await makeListing((await makeUser())._id, { status: 'active' });
    const res = await sendProperty(listing._id, { buyerEmail: 'bot@example.com', confirm_details: 'http://spam.example' });
    expect(res.status).toBe(200);
    expect(await Inquiry.countDocuments({ buyerEmail: 'bot@example.com' })).toBe(0);
    expect(email.sendAgentInquiry).not.toHaveBeenCalled();
  });

  it('does not accept inquiries for a draft listing', async () => {
    const listing = await makeListing((await makeUser())._id, { status: 'draft' });
    const res = await sendProperty(listing._id, { buyerEmail: 'draft@example.com' });
    expect(res.status).toBe(404);
  });

  it('rejects operator objects instead of ids', async () => {
    const res = await request(app)
      .post('/api/inquiries/agent')
      .send({ ...buyer, buyerEmail: 'obj@example.com', agentId: { $ne: null } });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('agent_not_found');
  });

  it('records a signed-in sender as buyerId', async () => {
    const agent = await makeUser({ role: 'agent' });
    const me = await makeUser();
    const res = await request(app)
      .post('/api/inquiries/agent')
      .set('Authorization', `Bearer ${tokenFor(me._id)}`)
      .send({ ...buyer, buyerEmail: 'signedin@example.com', agentId: String(agent._id) });

    expect(res.status).toBe(200);
    const saved = await Inquiry.findOne({ buyerEmail: 'signedin@example.com' }).lean();
    expect(String(saved!.buyerId)).toBe(String(me._id));
  });
});
