/**
 * Linking a residence's builder to its Business Directory company: only the
 * business's owner can link it; buyers then see the business's details and
 * its public page address (never the link id); the company page lists every
 * residence linked to it; the business page lists them too.
 */
import request from 'supertest';
import BusinessListing from '../../models/BusinessListing';
import { buildApp, setupDevelopment, makeUser, tokenFor, encodeId } from './helpers/explorerHarness';

const app = buildApp();
const PUB = '/api/developments';
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const makeBusiness = (owner: unknown, extra: Record<string, unknown> = {}) =>
  BusinessListing.create({ owner, name: 'Aria Build Group', category: 'construction', contactPhone: '+38921234567', city: 'Skopje', country: 'North Macedonia', description: 'We build homes.', isActive: true, ...extra });

describe('builder ↔ Business Directory', () => {
  it('links only a business the user owns; buyers see its details and page, never the link id', async () => {
    const t = await setupDevelopment({ published: true });
    const mine = await makeBusiness(t.owner._id);
    const theirs = await makeBusiness((await makeUser())._id, { name: 'Someone Else' });
    const link = (businessId: unknown) => request(app).put(`${DASH}/${t.devEnc}/builder/business`).set(auth(t.ownerToken)).send({ businessId });

    const refused = await link(encodeId(String(theirs._id)));
    expect(refused.status).toBe(404);
    expect(refused.body.code).toBe('BUSINESS_NOT_FOUND');
    expect((await link('not-an-id')).status).toBe(404);

    expect((await link(encodeId(String(mine._id)))).status).toBe(200);
    const detail = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(detail.body.development.builder).toMatchObject({ name: 'Aria Build Group', about: 'We build homes.', source: 'business', businessSlug: mine.slug });
    expect(JSON.stringify(detail.body)).not.toContain(String(mine._id));
    expect(JSON.stringify(detail.body)).not.toMatch(/businessListingId/);

    // A business that goes offline stops showing; the typed builder (its name) remains.
    await BusinessListing.updateOne({ _id: mine._id }, { $set: { isActive: false } });
    const offline = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(offline.body.development.builder).toEqual({ name: 'Aria Build Group' });

    await BusinessListing.updateOne({ _id: mine._id }, { $set: { isActive: true } });
    expect((await link(null)).status).toBe(200);
    expect((await request(app).get(`${PUB}/${t.dev.slug}`)).body.development.builder.source).toBeUndefined();
  });

  it('lists every residence linked to the business, on the company page and the business page', async () => {
    const a = await setupDevelopment({ published: true });
    const owner = a.owner;
    const business = await makeBusiness(owner._id);
    await request(app).put(`${DASH}/${a.devEnc}/builder/business`).set(auth(a.ownerToken)).send({ businessId: encodeId(String(business._id)) });
    // A residence of another account, linked by the business owner who is on its team as owner too.
    const b = await setupDevelopment({ published: true });
    const bOwnerBusiness = await makeBusiness(b.owner._id, { name: 'Other Co' });
    await request(app).put(`${DASH}/${b.devEnc}/builder/business`).set(auth(tokenFor(b.owner._id))).send({ businessId: encodeId(String(bOwnerBusiness._id)) });

    const company = await request(app).get(`${PUB}/${a.dev.slug}/developer`);
    expect(company.body.builder).toMatchObject({ source: 'business', businessSlug: business.slug });
    expect(company.body.residences.map((r: { slug: string }) => r.slug)).toEqual([a.dev.slug]);

    const listed = await request(app).get(`${PUB}/by-business/${business.slug}`);
    expect(listed.status).toBe(200);
    expect(listed.body.residences.map((r: { slug: string }) => r.slug)).toEqual([a.dev.slug]);
    expect((await request(app).get(`${PUB}/by-business/unknown-business`)).body).toEqual({ residences: [] });
  });
});
