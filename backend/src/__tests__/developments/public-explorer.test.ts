/**
 * Public explorer projections and the security fixes around them:
 * hidden units, price-on-request, effective availability, draft listings,
 * no ownership/storage internals, follow on unpublished developments and
 * cross-tenant listing detach.
 */
import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentFollow from '../../models/DevelopmentFollow';
import Property from '../../models/Property';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { attachListingToUnit } from '../../services/developments/developmentListingService';
import {
  buildApp,
  setupDevelopment,
  makeListing,
  linkListing,
  makeUser,
  tokenFor,
  encodeId,
} from './helpers/explorerHarness';

const app = buildApp();
const PUB = '/api/developments';
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Every string anywhere in a JSON value. */
const allStrings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => allStrings(x, out));
  return out;
};
const allKeys = (v: unknown, out: string[] = []): string[] => {
  if (Array.isArray(v)) v.forEach((x) => allKeys(x, out));
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) { out.push(k); allKeys(x, out); }
  }
  return out;
};

const setupPublic = async () => {
  const t = await setupDevelopment({ published: true });
  const hidden = await createUnit(t.devId, {
    buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'H1', unitType: 'apartment',
    availability: 'available', visibility: 'hidden', price: 1,
  });
  const onRequest = await createUnit(t.devId, {
    buildingId: t.building._id, floorId: t.floor2._id, unitNumber: 'R1', unitType: 'apartment',
    availability: 'available', price: 999999, pricePerSqm: 5000, priceVisibility: 'on_request',
  });
  const pending = await makeListing(t.owner._id, { status: 'pending', title: 'Pending' });
  const draft = await makeListing(t.owner._id, { status: 'draft', title: 'Draft' });
  await linkListing(t.unit, draft._id, true); // draft is primary on purpose
  await linkListing(t.unit, pending._id);
  return { ...t, hidden, onRequest, pending, draft };
};

describe('GET /:slug', () => {
  it('strips ownership and storage internals and adds per-building stats', async () => {
    const t = await setupPublic();
    t.dev.coverImagePublicId = 'developments/secret/cover';
    await t.dev.save();
    const res = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(res.status).toBe(200);
    const keys = allKeys(res.body.development);
    for (const k of ['ownerId', 'agencyId', 'coverImagePublicId', 'coverMediaId']) expect(keys).not.toContain(k);
    expect(allStrings(res.body)).not.toContain(String(t.owner._id));
    expect(allStrings(res.body)).not.toContain(encodeId(String(t.owner._id)));
    expect(res.body.development.allowUnitInquiries).toBe(true);
    // A1 → reserved via pending listing, R1 available, H1 hidden (not counted).
    expect(res.body.buildings[0].stats).toEqual({ units: 2, available: 1, withTour: 0 });
    expect(res.body.floors).toHaveLength(2);
  });

  it('404s a draft development', async () => {
    const t = await setupDevelopment();
    expect((await request(app).get(`${PUB}/${t.dev.slug}`)).status).toBe(404);
    expect((await request(app).get(`${PUB}/${t.dev.slug}/units`)).status).toBe(404);
  });
});

describe('GET /:slug/units', () => {
  it('applies visibility, price-on-request, effective availability and draft rules', async () => {
    const t = await setupPublic();
    const res = await request(app).get(`${PUB}/${t.dev.slug}/units`);
    expect(res.status).toBe(200);
    const numbers = res.body.units.map((u: { unitNumber: string }) => u.unitNumber);
    expect(numbers).toEqual(['A1', 'R1']);

    const a1 = res.body.units.find((u: { unitNumber: string }) => u.unitNumber === 'A1');
    expect(a1.availability).toBe('reserved');
    expect(a1.availabilitySource).toBe('listing');
    expect(a1.listingIds).toEqual([encodeId(String(t.pending._id))]);
    expect(a1.primaryListingId).toBe(encodeId(String(t.pending._id)));
    expect(a1.hasListing).toBe(true);
    expect(a1.priceOnRequest).toBe(false);
    expect(a1.price).toBe(150000);
    expect(a1.floorLabel).toBe('Floor 1');
    expect(a1.buildingName).toBe('Block A');

    const r1 = res.body.units.find((u: { unitNumber: string }) => u.unitNumber === 'R1');
    expect(r1.priceOnRequest).toBe(true);
    expect(r1).not.toHaveProperty('price');
    expect(r1).not.toHaveProperty('pricePerSqm');
    expect(r1.hasListing).toBe(false);
    expect(r1.floorLevel).toBe(2);

    const strings = allStrings(res.body);
    expect(strings).not.toContain(encodeId(String(t.draft._id)));
    expect(strings).not.toContain(String(t.draft._id));
    const keys = allKeys(res.body.units);
    for (const k of ['visibility', 'priceVisibility', 'mediaIds', 'floorplanMediaId', 'parkingRefs', 'storageRefs']) {
      expect(keys).not.toContain(k);
    }
    expect(JSON.stringify(res.body)).not.toContain('999999');

    expect(res.body.summary).toEqual({ total: 2, available: 1, priceMin: 150000, priceMax: 150000, currency: 'EUR' });
  });
});

describe('GET /:slug/units/:unitId', () => {
  it('returns the unit with sanitized non-draft listings', async () => {
    const t = await setupPublic();
    await DevelopmentUnit.updateOne(
      { _id: t.unit._id },
      { $set: { description: 'Corner flat', floorplan: { url: 'https://cdn/fp.jpg', publicId: 'secret/fp', width: 10, height: 5 } } }
    );
    const res = await request(app).get(`${PUB}/${t.dev.slug}/units/${encodeId(String(t.unit._id))}`);
    expect(res.status).toBe(200);
    expect(res.body.unit.description).toBe('Corner flat');
    expect(res.body.unit.floorplan).toEqual({ url: 'https://cdn/fp.jpg', width: 10, height: 5 });
    expect(res.body.unit.availability).toBe('reserved');
    expect(res.body.development).toEqual({
      name: t.dev.name, slug: t.dev.slug, city: 'Budva', country: 'Montenegro', allowUnitInquiries: true,
    });
    expect(res.body.listings).toHaveLength(1);
    const l = res.body.listings[0];
    expect(l.id).toBe(encodeId(String(t.pending._id)));
    expect(l.status).toBe('pending');
    expect(l.isNegotiable).toBe(false);
    expect(l.images).toEqual([{ url: 'https://example.com/a.jpg' }]);
    const strings = allStrings(res.body);
    expect(strings).not.toContain('secret/key/a');
    expect(strings).not.toContain('secret/fp');
    expect(strings).not.toContain('owner-private@example.com');
    expect(allKeys(res.body)).not.toContain('sellerId');
  });

  it('404s a hidden unit, an unknown unit and another development’s unit', async () => {
    const t = await setupPublic();
    const other = await setupDevelopment({ published: true });
    expect((await request(app).get(`${PUB}/${t.dev.slug}/units/${encodeId(String(t.hidden._id))}`)).status).toBe(404);
    expect((await request(app).get(`${PUB}/${t.dev.slug}/units/${encodeId(String(other.unit._id))}`)).status).toBe(404);
    expect((await request(app).get(`${PUB}/${t.dev.slug}/units/nonsense`)).status).toBe(404);
  });

  it('hides the on-request price on the detail too', async () => {
    const t = await setupPublic();
    const res = await request(app).get(`${PUB}/${t.dev.slug}/units/${encodeId(String(t.onRequest._id))}`);
    expect(res.status).toBe(200);
    expect(res.body.unit.priceOnRequest).toBe(true);
    expect(res.body.unit).not.toHaveProperty('price');
    expect(res.body.unit).not.toHaveProperty('pricePerSqm');
  });
});

describe('GET /api/developments (discovery list)', () => {
  it('does not expose owner ids', async () => {
    const t = await setupDevelopment({ published: true });
    const res = await request(app).get(PUB);
    expect(res.status).toBe(200);
    expect(res.body.developments).toHaveLength(1);
    expect(allKeys(res.body.developments)).not.toContain('ownerId');
    expect(allStrings(res.body)).not.toContain(encodeId(String(t.owner._id)));
  });
});

describe('follow endpoints', () => {
  it('404 on a draft development, work on a published one', async () => {
    const draft = await setupDevelopment();
    const buyer = await makeUser();
    const token = tokenFor(buyer._id);
    expect((await request(app).post(`${PUB}/${draft.dev.slug}/follow`).set(auth(token)).send({})).status).toBe(404);
    expect((await request(app).get(`${PUB}/${draft.dev.slug}/follow`).set(auth(token))).status).toBe(404);
    expect((await request(app).delete(`${PUB}/${draft.dev.slug}/follow`).set(auth(token))).status).toBe(404);
    expect(await DevelopmentFollow.countDocuments({})).toBe(0);

    const pub = await setupDevelopment({ published: true });
    const ok = await request(app).post(`${PUB}/${pub.dev.slug}/follow`).set(auth(token)).send({});
    expect(ok.status).toBe(200);
    expect(ok.body.following).toBe(true);
    const following = await request(app).get(`${PUB}/following`).set(auth(token));
    expect(following.body.developments).toHaveLength(1);
    expect(allKeys(following.body.developments)).not.toContain('ownerId');
  });
});

describe('detach listing — cross-tenant', () => {
  it('refuses to detach via another development’s unit or a listing not on the unit', async () => {
    const victim = await setupDevelopment();
    const attacker = await setupDevelopment();
    const listing = await makeListing(victim.owner._id);
    await attachListingToUnit({
      user: victim.owner as never,
      developmentId: String(victim.devId),
      unitId: String(victim.unit._id),
      listingId: String(listing._id),
    });

    // Attacker names the victim's unit under their own development.
    const viaForeignUnit = await request(app)
      .delete(`${DASH}/${attacker.devEnc}/units/${encodeId(String(victim.unit._id))}/listings/${encodeId(String(listing._id))}`)
      .set(auth(attacker.ownerToken));
    expect(viaForeignUnit.status).toBe(404);

    // Attacker names their own unit with the victim's listing.
    const viaOwnUnit = await request(app)
      .delete(`${DASH}/${attacker.devEnc}/units/${encodeId(String(attacker.unit._id))}/listings/${encodeId(String(listing._id))}`)
      .set(auth(attacker.ownerToken));
    expect(viaOwnUnit.status).toBe(404);

    const reloaded = await Property.findById(listing._id);
    expect(String(reloaded!.unitId)).toBe(String(victim.unit._id));
    expect(String(reloaded!.developmentId)).toBe(String(victim.devId));
    const unit = await DevelopmentUnit.findById(victim.unit._id);
    expect(unit!.listingIds.map(String)).toContain(String(listing._id));

    // The rightful owner can still detach.
    const ok = await request(app)
      .delete(`${DASH}/${victim.devEnc}/units/${encodeId(String(victim.unit._id))}/listings/${encodeId(String(listing._id))}`)
      .set(auth(victim.ownerToken));
    expect(ok.status).toBe(200);
    expect((await Property.findById(listing._id))!.unitId).toBeFalsy();
  });

  it('attach/preview cannot target another development’s unit', async () => {
    const victim = await setupDevelopment();
    const attacker = await setupDevelopment();
    const listing = await makeListing(attacker.owner._id);
    const preview = await request(app)
      .post(`${DASH}/${attacker.devEnc}/units/${encodeId(String(victim.unit._id))}/listings/preview`)
      .set(auth(attacker.ownerToken))
      .send({ listingId: encodeId(String(listing._id)) });
    expect(preview.status).toBe(404);
    const attach = await request(app)
      .post(`${DASH}/${attacker.devEnc}/units/${encodeId(String(victim.unit._id))}/listings`)
      .set(auth(attacker.ownerToken))
      .send({ listingId: encodeId(String(listing._id)) });
    expect(attach.status).toBe(404);
    expect((await DevelopmentUnit.findById(victim.unit._id))!.listingIds).toHaveLength(0);
  });
});
