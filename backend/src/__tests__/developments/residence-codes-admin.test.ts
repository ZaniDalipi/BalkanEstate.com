/**
 * Admin › Residences › Unlock codes, end to end: an admin creates codes, an
 * owner spends one at checkout, the admin sees who used it, switches codes
 * off, and can delete only an unused one. Non-admins are refused.
 */
import request from 'supertest';
import express from 'express';
import adminRoutes from '../../routes/adminRoutes';
import DiscountCode from '../../models/DiscountCode';
import { buildApp, setupDevelopment, makeUser, tokenFor } from './helpers/explorerHarness';

const app = buildApp();
const adminApp = express().use(express.json()).use('/api/admin', adminRoutes);
const ADMIN = '/api/admin/residences/codes';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('admin residence unlock codes', () => {
  it('creates codes an owner can unlock a pass with, and shows who used them', async () => {
    const admin = await makeUser({ role: 'admin' });
    const token = tokenFor(admin._id);
    const created = await request(adminApp).post(ADMIN).set(auth(token)).send({ kind: 'pass', count: 2, note: 'Launch partners' });
    expect(created.status).toBe(201);
    expect(created.body.codes).toHaveLength(2);
    const [first] = created.body.codes as string[];
    expect(first).toMatch(/^RES-/);

    const t = await setupDevelopment();
    const paid = await request(app).post(`/api/dashboard/developments/${t.devEnc}/billing/checkout`).set(auth(t.ownerToken)).send({ kind: 'pass', couponCode: first });
    expect(paid.status).toBeLessThan(300);

    const list = await request(adminApp).get(ADMIN).set(auth(token));
    const used = list.body.items.find((c: { code: string }) => c.code === first);
    expect(used).toMatchObject({ kind: 'pass', status: 'used', usedCount: 1, note: 'Launch partners' });
    expect(used.uses[0].residence.slug).toBe(t.dev.slug);

    // A used code cannot be deleted; switched off, it no longer unlocks anything.
    expect((await request(adminApp).delete(`${ADMIN}/${used.id}`).set(auth(token))).body.code).toBe('CODE_IN_USE');
    const other = list.body.items.find((c: { code: string }) => c.code !== first);
    expect((await request(adminApp).patch(`${ADMIN}/${other.id}`).set(auth(token)).send({ isActive: false })).status).toBe(200);
    const t2 = await setupDevelopment();
    const refused = await request(app).post(`/api/dashboard/developments/${t2.devEnc}/billing/checkout`).set(auth(t2.ownerToken)).send({ kind: 'pass', couponCode: other.code });
    expect(refused.body.code).toBe('COUPON_INVALID');
    expect((await request(adminApp).delete(`${ADMIN}/${other.id}`).set(auth(token))).status).toBe(200);
    expect(await DiscountCode.countDocuments({ code: other.code })).toBe(0);
  });

  it('refuses people who are not admins', async () => {
    const user = await makeUser();
    expect((await request(adminApp).get(ADMIN).set(auth(tokenFor(user._id)))).status).toBe(403);
  });

  it('a discount code lowers the price without spending itself; the owner learns what is left to pay', async () => {
    const admin = await makeUser({ role: 'admin' });
    const made = await request(adminApp).post(ADMIN).set(auth(tokenFor(admin._id))).send({ kind: 'pass', discountType: 'percentage', discountValue: 20 });
    const [code] = made.body.codes as string[];
    const t = await setupDevelopment();
    const res = await request(app).post(`/api/dashboard/developments/${t.devEnc}/billing/checkout`).set(auth(t.ownerToken)).send({ kind: 'pass', couponCode: code });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('PAYMENT_NOT_CONFIGURED');
    expect(res.body.details).toMatchObject({ couponCode: code });
    expect(res.body.details.amount).toBeCloseTo(res.body.details.listAmount * 0.8, 2);
    expect((await DiscountCode.findOne({ code }))?.usedCount).toBe(0);
  });
});

