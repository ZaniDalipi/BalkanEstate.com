/**
 * Unit gallery upload/removal and floorplan removal (media service mocked),
 * the dashboard "has listing" filter, the Activity (audit) endpoint, and
 * cleanup of unit links when listings are hard-deleted.
 */
import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import Property from '../../models/Property';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { createDevelopment } from '../../services/developments/developmentService';
import { MAX_UNIT_GALLERY } from '../../services/developments/unitAdminService';
import { buildApp, setupDevelopment, addMember, makeListing, linkListing, makeUser } from './helpers/explorerHarness';

jest.mock('../../services/mediaService', () => {
  const actual = jest.requireActual('../../services/mediaService');
  return {
    ...actual,
    isMediaStorageConfigured: jest.fn(() => true),
    uploadImage: jest.fn(async () => {
      const key = Math.random().toString(36).slice(2);
      return { url: `https://cdn.example.com/g-${key}.jpg`, publicId: `developments/x/${key}`, width: 1600, height: 1000 };
    }),
    deleteImage: jest.fn(async () => undefined),
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const media = require('../../services/mediaService');

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const png = Buffer.from('89504e470d0a1a0a', 'hex');

describe('unit gallery', () => {
  it('uploads several images, removes one by index, and deletes its stored file', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}/gallery`;
    const up = await request(app)
      .post(url)
      .set(auth(t.ownerToken))
      .attach('images', png, { filename: 'a.png', contentType: 'image/png' })
      .attach('images', png, { filename: 'b.png', contentType: 'image/png' });
    expect(up.status).toBe(201);
    expect(up.body.unit.gallery).toHaveLength(2);
    expect(up.body.unit.gallery[0].publicId).toBeUndefined();

    const stored = (await DevelopmentUnit.findById(t.unit._id))!.gallery;
    media.deleteImage.mockClear();
    const del = await request(app).delete(`${url}/0`).set(auth(t.ownerToken));
    expect(del.status).toBe(200);
    expect(del.body.unit.gallery).toHaveLength(1);
    expect(del.body.unit.gallery[0].url).toBe(stored[1].url);
    expect(media.deleteImage).toHaveBeenCalledWith(stored[0].publicId);

    const missing = await request(app).delete(`${url}/9`).set(auth(t.ownerToken));
    expect(missing.status).toBe(404);
  });

  it('refuses to grow past the gallery cap and rolls back the uploads', async () => {
    const t = await setupDevelopment();
    await DevelopmentUnit.updateOne(
      { _id: t.unit._id },
      { $set: { gallery: Array.from({ length: MAX_UNIT_GALLERY - 1 }, (_, i) => ({ url: `https://cdn.example.com/x${i}.jpg` })) } }
    );
    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}/gallery`)
      .set(auth(t.ownerToken))
      .attach('images', png, { filename: 'a.png', contentType: 'image/png' })
      .attach('images', png, { filename: 'b.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect((await DevelopmentUnit.findById(t.unit._id))!.gallery).toHaveLength(MAX_UNIT_GALLERY - 1);
  });

  it('is scoped to the development and needs media.upload', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    const foreign = await request(app)
      .post(`${DASH}/${t.devEnc}/units/${other.enc(other.unit._id)}/gallery`)
      .set(auth(t.ownerToken))
      .attach('images', png, { filename: 'a.png', contentType: 'image/png' });
    expect(foreign.status).toBe(404);

    const agent = await addMember(t.devId, 'sales_agent');
    const denied = await request(app)
      .post(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}/gallery`)
      .set(auth(agent.token))
      .attach('images', png, { filename: 'a.png', contentType: 'image/png' });
    expect(denied.status).toBe(403);
  });
});

describe('DELETE /units/:unitId/floorplan', () => {
  it('clears the floorplan and deletes the stored file', async () => {
    const t = await setupDevelopment();
    await DevelopmentUnit.updateOne({ _id: t.unit._id }, { $set: { floorplan: { url: 'https://cdn.example.com/fp.jpg', publicId: 'fp-key' } } });
    media.deleteImage.mockClear();
    const res = await request(app).delete(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}/floorplan`).set(auth(t.ownerToken));
    expect(res.status).toBe(200);
    expect(res.body.unit.floorplan).toBeUndefined();
    expect(media.deleteImage).toHaveBeenCalledWith('fp-key');
  });
});

describe('GET /units?hasListing', () => {
  it('filters units by whether a listing is linked', async () => {
    const t = await setupDevelopment();
    const b = await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'B2', unitType: 'apartment' });
    const listing = await makeListing(t.owner._id);
    await linkListing(b, listing._id);

    const withL = await request(app).get(`${DASH}/${t.devEnc}/units?hasListing=true`).set(auth(t.ownerToken));
    expect(withL.body.units.map((u: { unitNumber: string }) => u.unitNumber)).toEqual(['B2']);
    const without = await request(app).get(`${DASH}/${t.devEnc}/units?hasListing=false`).set(auth(t.ownerToken));
    expect(without.body.units.map((u: { unitNumber: string }) => u.unitNumber)).toEqual(['A1']);
    const bad = await request(app).get(`${DASH}/${t.devEnc}/units?hasListing=maybe`).set(auth(t.ownerToken));
    expect(bad.status).toBe(400);
  });
});

describe('GET /audit', () => {
  it('lists the trail newest first with actor names, and is limited to team managers', async () => {
    const t = await setupDevelopment();
    await request(app)
      .patch(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`)
      .set(auth(t.ownerToken))
      .send({ price: 160000 });

    const res = await request(app).get(`${DASH}/${t.devEnc}/audit?limit=10`).set(auth(t.ownerToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    const actions = res.body.entries.map((e: { action: string }) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['unit.update', 'price.change']));
    expect(res.body.entries[0].actorName).toBe(t.owner.name);
    expect(res.body.entries[0].targetId).not.toBe(String(t.unit._id));

    const family = await request(app).get(`${DASH}/${t.devEnc}/audit?action=price`).set(auth(t.ownerToken));
    expect(family.body.entries.every((e: { action: string }) => e.action.startsWith('price.'))).toBe(true);
    const bad = await request(app).get(`${DASH}/${t.devEnc}/audit?action=${encodeURIComponent('.*')}`).set(auth(t.ownerToken));
    expect(bad.status).toBe(400);

    const editor = await addMember(t.devId, 'editor');
    const denied = await request(app).get(`${DASH}/${t.devEnc}/audit`).set(auth(editor.token));
    expect(denied.status).toBe(403);
  });
});

describe('deleting a listing detaches it from units', () => {
  it('covers doc.deleteOne, findByIdAndDelete and deleteMany', async () => {
    const t = await setupDevelopment();
    const [a, b, c] = await Promise.all([makeListing(t.owner._id), makeListing(t.owner._id), makeListing(t.owner._id)]);
    for (const l of [a, b, c]) {
      // eslint-disable-next-line no-await-in-loop
      await linkListing(t.unit, l._id);
    }
    await DevelopmentUnit.updateOne({ _id: t.unit._id }, { $set: { primaryListingId: a._id } });

    await a.deleteOne();
    let unit = (await DevelopmentUnit.findById(t.unit._id))!;
    expect(unit.listingIds.map(String)).toEqual([String(b._id), String(c._id)]);
    expect(unit.primaryListingId).toBeUndefined();

    await Property.findByIdAndDelete(b._id);
    unit = (await DevelopmentUnit.findById(t.unit._id))!;
    expect(unit.listingIds.map(String)).toEqual([String(c._id)]);

    await Property.deleteMany({ _id: c._id });
    unit = (await DevelopmentUnit.findById(t.unit._id))!;
    expect(unit.listingIds).toHaveLength(0);
  });
});

describe('input types', () => {
  it('a non-string name is a 400, not a crash', async () => {
    const user = await makeUser();
    await expect(
      createDevelopment({ name: 42 as never, country: 'Montenegro', city: 'Budva', category: 'apartment_building' }, user as never)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
