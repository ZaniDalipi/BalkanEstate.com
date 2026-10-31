/**
 * Scenes / building views — publish lifecycle and the public explorer
 * endpoints (real mongod, supertest).
 *
 * Visitors only ever see the PUBLISHED snapshot, with hotspots stripped when
 * they point at a hidden/deleted unit, an entity outside the development or a
 * draft listing — and never any internal field.
 */
import express from 'express';
import request from 'supertest';

const uploadImageMock = jest.fn();
jest.mock('../../services/mediaService', () => ({
  ...jest.requireActual('../../services/mediaService'),
  uploadImage: (...args: unknown[]) => uploadImageMock(...args),
  deleteImage: jest.fn().mockResolvedValue(undefined),
  isMediaStorageConfigured: () => true,
}));

import developmentDashboardRoutes from '../../routes/developmentDashboardRoutes';
import developmentRoutes from '../../routes/developmentRoutes';
import Development from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentScene from '../../models/DevelopmentScene';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import Property from '../../models/Property';
import User from '../../models/User';
import { encodeId } from '../../utils/idObfuscation';
import { generateAccessToken } from '../../utils/jwt';
import { createMockUser } from '../setup';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/dashboard/developments', developmentDashboardRoutes);
app.use('/api/developments', developmentRoutes);

const rnd = () => Math.random().toString(36).slice(2, 10);
const enc = (id: unknown) => encodeId(String(id));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(() => {
  uploadImageMock.mockReset();
  uploadImageMock.mockImplementation(async () => {
    const id = rnd();
    return { url: `https://cdn.test/${id}.jpg`, publicId: `secret/${id}`, width: 1600, height: 900 };
  });
});

const makeListing = (sellerId: unknown, status = 'active') =>
  Property.create({
    sellerId,
    createdByName: 'Owner',
    createdByEmail: 'owner@example.com',
    createdAsRole: 'private_seller',
    listingType: 'sale',
    price: 100000,
    address: '1 Main St',
    city: 'Budva',
    country: 'Montenegro',
    beds: 2,
    baths: 1,
    livingRooms: 1,
    sqft: 70,
    yearBuilt: 2018,
    description: 'Nice flat',
    imageUrl: 'https://example.com/i.jpg',
    lat: 42.28,
    lng: 18.84,
    propertyType: 'apartment',
    status,
  });

const setup = async (status: 'draft' | 'published' = 'published') => {
  const owner = await User.create(createMockUser({ email: `u-${rnd()}@example.com` }));
  const slug = `dev-${rnd()}`;
  const dev = await Development.create({
    ownerId: owner._id,
    ownerType: 'user',
    name: `Dev ${rnd()}`,
    slug,
    country: 'Montenegro',
    city: 'Budva',
    category: 'apartment_building',
    status,
    // Residence Pass: a published residence is public only within its trial/pass.
    ...(status === 'published' ? { visibleUntil: new Date(Date.now() + 86_400_000) } : {}),
  });
  const building = await DevelopmentBuilding.create({ developmentId: dev._id, name: 'B2', slug: `b2-${rnd()}` });
  const floor = await DevelopmentFloor.create({ developmentId: dev._id, buildingId: building._id, label: 'F1', level: 1 });
  const unitFor = (n: string) =>
    DevelopmentUnit.create({
      developmentId: dev._id,
      buildingId: building._id,
      floorId: floor._id,
      unitNumber: n,
      unitType: 'apartment',
    });
  const visible = await unitFor('A1');
  const toHide = await unitFor('A2');
  const toDelete = await unitFor('A3');
  const auth = `Bearer ${generateAccessToken(String(owner._id))}`;
  const base = `/api/dashboard/developments/${enc(dev._id)}`;
  return { owner, dev, slug, building, floor, visible, toHide, toDelete, auth, base };
};

type Ctx = Awaited<ReturnType<typeof setup>>;

const uploadView = async (ctx: Ctx, fields: Record<string, string>) => {
  let req = request(app).post(`${ctx.base}/scenes`).set('Authorization', ctx.auth);
  const target = fields.targetType === 'development' ? {} : { targetType: 'building', targetId: enc(ctx.building._id) };
  for (const [k, v] of Object.entries({ ...target, ...fields }))
    req = req.field(k, v);
  const res = await req.attach('image', PNG, { filename: 'v.png', contentType: 'image/png' });
  expect(res.status).toBe(201);
  return res.body.scene as { id: string; draft: { version: number } };
};

const sq = (x: number) => [
  [x, 0.1],
  [x + 0.1, 0.1],
  [x + 0.1, 0.3],
  [x, 0.3],
];
const hs = (id: string, linkType: string, linkId: string, x: number) => ({
  id,
  shape: 'polygon',
  points: sq(x),
  linkType,
  linkId,
  z: 0,
});

const saveDraft = (ctx: Ctx, sceneId: string, hotspots: unknown[]) =>
  request(app).patch(`${ctx.base}/scenes/${sceneId}/draft`).set('Authorization', ctx.auth).send({ hotspots });
const publish = (ctx: Ctx, sceneId: string) =>
  request(app).post(`${ctx.base}/scenes/${sceneId}/publish`).set('Authorization', ctx.auth);
const views = (slug: string, query: Record<string, string>) =>
  request(app).get(`/api/developments/${slug}/views`).query(query);

describe('publish → public views', () => {
  it('serves published views sorted by sortOrder then viewKey with filtered hotspots and no internals', async () => {
    const ctx = await setup();
    const draftListing = await makeListing(ctx.owner._id, 'draft');
    const liveListing = await makeListing(ctx.owner._id, 'active');

    const back = await uploadView(ctx, { viewKey: 'back', viewDirection: 'back', sortOrder: '1', viewName: 'Back' });
    const front = await uploadView(ctx, { viewKey: 'front', viewDirection: 'front', sortOrder: '0' });
    const aerial = await uploadView(ctx, { viewKey: 'aerial', viewDirection: 'aerial', sortOrder: '1' });
    await uploadView(ctx, { viewKey: 'never-published', sortOrder: '0' });

    expect(
      (
        await saveDraft(ctx, front.id, [
          hs('v', 'unit', enc(ctx.visible._id), 0.0),
          hs('h', 'unit', enc(ctx.toHide._id), 0.15),
          hs('d', 'unit', enc(ctx.toDelete._id), 0.3),
          hs('ld', 'listing', enc(draftListing._id), 0.45),
          hs('ll', 'listing', enc(liveListing._id), 0.6),
          hs('fl', 'floor', enc(ctx.floor._id), 0.75),
        ])
      ).status
    ).toBe(200);
    expect((await publish(ctx, front.id)).status).toBe(200);
    expect((await publish(ctx, back.id)).status).toBe(200);
    expect((await publish(ctx, aerial.id)).status).toBe(200);
    expect(await DevelopmentAuditLog.countDocuments({ action: 'scene.publish' })).toBe(3);

    // After publishing: hide one unit, soft-delete another.
    await DevelopmentUnit.updateOne({ _id: ctx.toHide._id }, { $set: { visibility: 'hidden' } });
    await DevelopmentUnit.updateOne({ _id: ctx.toDelete._id }, { $set: { deletedAt: new Date() } });
    // A later draft edit must never leak.
    await saveDraft(ctx, front.id, [hs('draft-only', 'unit', enc(ctx.visible._id), 0.5)]);

    const res = await views(ctx.slug, { targetType: 'building', targetId: enc(ctx.building._id) });
    expect(res.status).toBe(200);
    expect(res.body.views.map((v: { viewKey: string }) => v.viewKey)).toEqual(['front', 'aerial', 'back']);

    const frontView = res.body.views[0];
    expect(Object.keys(frontView).sort()).toEqual(
      ['hotspots', 'imageHeight', 'imageUrl', 'imageWidth', 'sortOrder', 'viewDirection', 'viewKey'].sort()
    );
    expect(res.body.views[2]).toMatchObject({ viewName: 'Back', viewDirection: 'back' });
    expect(frontView.hotspots.map((h: { id: string }) => h.id)).toEqual(['v', 'll', 'fl']);
    expect(frontView.hotspots[0]).toEqual({
      id: 'v',
      shape: 'polygon',
      points: sq(0.0),
      linkType: 'unit',
      linkId: enc(ctx.visible._id),
      z: 0,
    });

    // A listing region carries a buyer-facing summary for the hover card.
    const ll = frontView.hotspots.find((h: { id: string }) => h.id === 'll');
    expect(ll.listing).toEqual({
      price: 100000,
      listingType: 'sale',
      area: 70,
      beds: 2,
      baths: 1,
      propertyType: 'apartment',
      status: 'active',
      imageUrl: 'https://example.com/i.jpg',
    });

    const body = JSON.stringify(res.body);
    for (const leak of ['owner@example.com', 'sellerId', 'draft-only', 'imagePublicId', 'secret/', 'uploadedBy', 'developmentId', 'draft"', String(ctx.visible._id)]) {
      expect(body).not.toContain(leak);
    }

    // Legacy endpoint: the lowest-sortOrder view (no 'main' here), same filtering.
    const legacy = await request(app)
      .get(`/api/developments/${ctx.slug}/scene`)
      .query({ targetType: 'building', targetId: enc(ctx.building._id) });
    expect(legacy.status).toBe(200);
    expect(Object.keys(legacy.body.scene).sort()).toEqual(
      ['hotspots', 'imageHeight', 'imageUrl', 'imageWidth', 'targetType'].sort()
    );
    expect(legacy.body.scene.hotspots.map((h: { id: string }) => h.id)).toEqual(['v', 'll', 'fl']);
  });

  it('legacy /scene prefers the main view and still works for the development aerial', async () => {
    const ctx = await setup();
    const other = await uploadView(ctx, { targetType: 'development', viewKey: 'other', sortOrder: '0' });
    const main = await uploadView(ctx, { targetType: 'development', sortOrder: '5' });
    await saveDraft(ctx, main.id, [hs('b', 'building', enc(ctx.building._id), 0.1)]);
    await publish(ctx, other.id);
    await publish(ctx, main.id);

    const legacy = await request(app).get(`/api/developments/${ctx.slug}/scene`);
    expect(legacy.status).toBe(200);
    expect(legacy.body.scene.targetType).toBe('development');
    expect(legacy.body.scene.hotspots.map((h: { id: string }) => h.id)).toEqual(['b']);

    const none = await request(app)
      .get(`/api/developments/${ctx.slug}/scene`)
      .query({ targetType: 'floor', targetId: enc(ctx.floor._id) });
    expect(none.body).toEqual({ scene: null });
  });

  it('unpublish removes a view from the public endpoints', async () => {
    const ctx = await setup();
    const scene = await uploadView(ctx, { viewKey: 'front' });
    await publish(ctx, scene.id);
    expect((await views(ctx.slug, { targetType: 'building', targetId: enc(ctx.building._id) })).body.views).toHaveLength(1);

    const res = await request(app).post(`${ctx.base}/scenes/${scene.id}/unpublish`).set('Authorization', ctx.auth);
    expect(res.status).toBe(200);
    expect(res.body.scene.published).toBeUndefined();
    expect(await DevelopmentAuditLog.countDocuments({ action: 'scene.unpublish' })).toBe(1);
    expect((await views(ctx.slug, { targetType: 'building', targetId: enc(ctx.building._id) })).body.views).toEqual([]);
  });

  it('publish re-validates links: an entity deleted since the draft blocks publishing with HotspotIssues', async () => {
    const ctx = await setup();
    const scene = await uploadView(ctx, {});
    await saveDraft(ctx, scene.id, [hs('gone', 'unit', enc(ctx.toDelete._id), 0.1)]);
    await DevelopmentUnit.updateOne({ _id: ctx.toDelete._id }, { $set: { deletedAt: new Date() } });

    const res = await publish(ctx, scene.id);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      expect.objectContaining({ index: 0, hotspotId: 'gone', field: 'linkId', code: 'link_not_found' }),
    ]);
    expect((await DevelopmentScene.findOne({}).lean())!.published).toBeUndefined();
  });

  it('404s an unpublished development and a target outside the development; 400s a bad targetType', async () => {
    const draftDev = await setup('draft');
    const scene = await uploadView(draftDev, {});
    await publish(draftDev, scene.id);
    expect((await views(draftDev.slug, { targetType: 'building', targetId: enc(draftDev.building._id) })).status).toBe(404);
    expect((await request(app).get(`/api/developments/${draftDev.slug}/scene`)).status).toBe(404);

    const ctx = await setup();
    expect((await views(ctx.slug, { targetType: 'building', targetId: enc(draftDev.building._id) })).status).toBe(404);
    expect((await views(ctx.slug, { targetType: 'building', targetId: 'nope' })).status).toBe(400);
    expect((await views(ctx.slug, { targetType: 'unit', targetId: enc(ctx.visible._id) })).status).toBe(400);
    expect((await views(ctx.slug, {})).body).toEqual({ views: [] });
  });
});
