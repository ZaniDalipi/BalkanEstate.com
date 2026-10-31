/**
 * POST /api/developments/:slug/units/:unitId/inquiries — buyer inquiries about
 * a unit. The email service is mocked; a failing email must never fail the
 * request because the inquiry is already persisted.
 */
import request from 'supertest';
import Inquiry from '../../models/Inquiry';
import Development from '../../models/Development';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { buildApp, setupDevelopment, makeListing, linkListing, encodeId } from './helpers/explorerHarness';

jest.mock('../../services/emailService', () => ({
  sendAgentInquiry: jest.fn(async () => undefined),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const email = require('../../services/emailService');

const app = buildApp();
const PUB = '/api/developments';
const valid = { name: 'Ana Buyer', email: 'ana@example.com', phone: '+382 67 000 000', message: 'Is this unit still available?' };
const flush = () => new Promise((r) => setTimeout(r, 100));

const url = (slug: string, unitId: unknown) => `${PUB}/${slug}/units/${encodeId(String(unitId))}/inquiries`;

describe('unit inquiries', () => {
  beforeEach(() => email.sendAgentInquiry.mockReset().mockResolvedValue(undefined));

  it('persists a development inquiry to the owner and emails best-effort', async () => {
    const t = await setupDevelopment({ published: true });
    const res = await request(app).post(url(t.dev.slug, t.unit._id)).send(valid);
    expect(res.status).toBe(201);
    expect(typeof res.body.message).toBe('string');

    const saved = await Inquiry.findOne({ type: 'development' }).lean();
    expect(saved).not.toBeNull();
    expect(String(saved!.recipientId)).toBe(String(t.owner._id));
    expect(saved!.recipientEmail).toBe(t.owner.email);
    expect(String(saved!.developmentId)).toBe(String(t.devId));
    expect(String(saved!.unitId)).toBe(String(t.unit._id));
    expect(saved!.buyerEmail).toBe('ana@example.com');
    expect(saved!.propertyId).toBeUndefined();

    await flush();
    expect(email.sendAgentInquiry).toHaveBeenCalledTimes(1);
    expect(email.sendAgentInquiry.mock.calls[0][0]).toMatchObject({ agentEmail: t.owner.email, buyerName: 'Ana Buyer' });
  });

  it('still records unit/development refs when the unit has a published primary listing', async () => {
    const t = await setupDevelopment({ published: true });
    const listing = await makeListing(t.owner._id, { status: 'active' });
    await linkListing(t.unit, listing._id, true);
    const res = await request(app).post(url(t.dev.slug, t.unit._id)).send(valid);
    expect(res.status).toBe(201);
    const saved = await Inquiry.findOne({ type: 'development' }).lean();
    expect(String(saved!.propertyId)).toBe(String(listing._id));
    expect(String(saved!.unitId)).toBe(String(t.unit._id));
    expect(String(saved!.developmentId)).toBe(String(t.devId));
  });

  it('never fails on an email error', async () => {
    email.sendAgentInquiry.mockRejectedValue(new Error('SMTP down'));
    const t = await setupDevelopment({ published: true });
    const res = await request(app).post(url(t.dev.slug, t.unit._id)).send(valid);
    expect(res.status).toBe(201);
    await flush();
    expect(await Inquiry.countDocuments({ type: 'development' })).toBe(1);
  });

  it('403 inquiries_disabled when the development turned them off', async () => {
    const t = await setupDevelopment({ published: true });
    await Development.updateOne({ _id: t.devId }, { $set: { allowUnitInquiries: false } });
    const res = await request(app).post(url(t.dev.slug, t.unit._id)).send(valid);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('inquiries_disabled');
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it('the dashboard toggles allowUnitInquiries (boolean only)', async () => {
    const t = await setupDevelopment({ published: true });
    const dash = `/api/dashboard/developments/${t.devEnc}`;
    const bad = await request(app).patch(dash).set('Authorization', `Bearer ${t.ownerToken}`).send({ allowUnitInquiries: 'no' });
    expect(bad.status).toBe(400);
    const off = await request(app).patch(dash).set('Authorization', `Bearer ${t.ownerToken}`).send({ allowUnitInquiries: false });
    expect(off.status).toBe(200);
    expect(off.body.development.allowUnitInquiries).toBe(false);
    const res = await request(app).post(url(t.dev.slug, t.unit._id)).send(valid);
    expect(res.status).toBe(403);
    const detail = await request(app).get(`${PUB}/${t.dev.slug}/units/${encodeId(String(t.unit._id))}`);
    expect(detail.body.development.allowUnitInquiries).toBe(false);
  });

  it('404 for a hidden unit, a draft development, or another development’s unit', async () => {
    const t = await setupDevelopment({ published: true });
    const hidden = await createUnit(t.devId, {
      buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'H1', unitType: 'apartment', visibility: 'hidden',
    });
    expect((await request(app).post(url(t.dev.slug, hidden._id)).send(valid)).status).toBe(404);
    const draft = await setupDevelopment();
    expect((await request(app).post(url(draft.dev.slug, draft.unit._id)).send(valid)).status).toBe(404);
    expect((await request(app).post(url(t.dev.slug, draft.unit._id)).send(valid)).status).toBe(404);
    expect(await Inquiry.countDocuments({})).toBe(0);
  });

  it('validates name, email, phone and message', async () => {
    const t = await setupDevelopment({ published: true });
    const u = url(t.dev.slug, t.unit._id);
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...valid, name: 'A' }, 'name'],
      [{ ...valid, name: 'x'.repeat(101) }, 'name'],
      [{ ...valid, email: 'not-an-email' }, 'email'],
      [{ ...valid, phone: '1'.repeat(41) }, 'phone'],
      [{ ...valid, message: 'too short' }, 'message'],
      [{ ...valid, message: 'x'.repeat(2001) }, 'message'],
    ];
    for (const [body, field] of cases) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post(u).send(body);
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: { field: string }) => e.field)).toContain(field);
    }
    const { phone, ...noPhone } = valid;
    void phone;
    expect((await request(app).post(u).send(noPhone)).status).toBe(201);
    expect(await Inquiry.countDocuments({})).toBe(1);
  });
});
