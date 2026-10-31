/**
 * Scenes / building views — dashboard API (real mongod, supertest).
 *
 * Covers: several views per building, viewKey uniqueness, encoded and foreign
 * target ids, hotspot validation (geometry rejected never clamped, links proven
 * to belong to this development), optimistic concurrency on drafts, and the
 * per-route permission guards.
 */
import express from 'express';
import request from 'supertest';

const uploadImageMock = jest.fn();
const deleteImageMock = jest.fn();
jest.mock('../../services/mediaService', () => ({
  ...jest.requireActual('../../services/mediaService'),
  uploadImage: (...args: unknown[]) => uploadImageMock(...args),
  deleteImage: (...args: unknown[]) => deleteImageMock(...args),
  isMediaStorageConfigured: () => true,
}));

import developmentDashboardRoutes from '../../routes/developmentDashboardRoutes';
import Development from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentScene from '../../models/DevelopmentScene';
import DevelopmentMembership from '../../models/DevelopmentMembership';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import Property from '../../models/Property';
import User from '../../models/User';
import { encodeId } from '../../utils/idObfuscation';
import { generateAccessToken } from '../../utils/jwt';
import { createMockUser } from '../setup';

const app = express();
app.use(express.json({ limit: '10mb' })); // as server.ts
app.use('/api/dashboard/developments', developmentDashboardRoutes);

const rnd = () => Math.random().toString(36).slice(2, 10);
const enc = (id: unknown) => encodeId(String(id));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let uploadCount = 0;
const nextImage = (width = 1600, height = 900) =>
  uploadImageMock.mockImplementationOnce(async () => {
    uploadCount += 1;
    return { url: `https://cdn.test/scene-${uploadCount}.jpg`, publicId: `scene-${uploadCount}`, width, height };
  });

const makeUser = () => User.create(createMockUser({ email: `u-${rnd()}@example.com` }));
const tokenFor = (user: { _id: unknown }) => `Bearer ${generateAccessToken(String(user._id))}`;

const makeListing = (sellerId: unknown, overrides: Record<string, unknown> = {}) =>
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
    ...overrides,
  });

const makeDevelopment = async (ownerId: unknown) => {
  const dev = await Development.create({
    ownerId,
    ownerType: 'user',
    name: `Dev ${rnd()}`,
    slug: `dev-${rnd()}`,
    country: 'Montenegro',
    city: 'Budva',
    category: 'apartment_building',
  });
  const building = await DevelopmentBuilding.create({ developmentId: dev._id, name: 'Block B2', slug: `b2-${rnd()}` });
  const floor = await DevelopmentFloor.create({
    developmentId: dev._id,
    buildingId: building._id,
    label: 'Floor 1',
    level: 1,
  });
  const unit = await DevelopmentUnit.create({
    developmentId: dev._id,
    buildingId: building._id,
    floorId: floor._id,
    unitNumber: `A${rnd()}`,
    unitType: 'apartment',
  });
  return { dev, building, floor, unit };
};

const setup = async () => {
  const owner = await makeUser();
  const ctx = await makeDevelopment(owner._id);
  return { owner, auth: tokenFor(owner), ...ctx, base: `/api/dashboard/developments/${enc(ctx.dev._id)}` };
};

const upload = (base: string, auth: string, fields: Record<string, string>) => {
  let req = request(app).post(`${base}/scenes`).set('Authorization', auth);
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  return req.attach('image', PNG, { filename: 'scene.png', contentType: 'image/png' });
};

const square = (x = 0.1, y = 0.1, s = 0.2) => [
  [x, y],
  [x + s, y],
  [x + s, y + s],
  [x, y + s],
];

const hotspot = (overrides: Record<string, unknown> = {}) => ({
  id: `h-${rnd()}`,
  shape: 'polygon',
  points: square(),
  linkType: 'unit',
  linkId: 'x',
  z: 0,
  ...overrides,
});

beforeEach(() => {
  uploadImageMock.mockReset();
  deleteImageMock.mockReset();
  deleteImageMock.mockResolvedValue(undefined);
});

describe('POST /scenes — building views', () => {
  it('creates several views of one building, keyed by viewKey, with an encoded targetId', async () => {
    const { auth, base, building } = await setup();

    nextImage();
    const front = await upload(base, auth, {
      targetType: 'building',
      targetId: enc(building._id),
      viewKey: 'front',
      viewName: 'Front facade',
      viewDirection: 'front',
      sortOrder: '0',
    });
    expect(front.status).toBe(201);
    expect(front.body.aspectChanged).toBe(false);
    expect(front.body.scene).toMatchObject({
      viewKey: 'front',
      viewName: 'Front facade',
      viewDirection: 'front',
      sortOrder: 0,
      targetType: 'building',
      targetId: enc(building._id),
    });

    nextImage();
    const back = await upload(base, auth, {
      targetType: 'building',
      targetId: enc(building._id),
      viewKey: 'back',
      viewDirection: 'back',
      sortOrder: '1',
    });
    expect(back.status).toBe(201);
    expect(back.body.scene.id).not.toBe(front.body.scene.id);

    expect(await DevelopmentScene.countDocuments({ targetId: building._id, deletedAt: null })).toBe(2);
    const audits = await DevelopmentAuditLog.countDocuments({ action: 'scene.upload' });
    expect(audits).toBe(2);
  });

  it('defaults viewKey to main and rejects a malformed viewKey / direction / sortOrder', async () => {
    const { auth, base, building } = await setup();
    nextImage();
    const res = await upload(base, auth, { targetType: 'building', targetId: enc(building._id) });
    expect(res.status).toBe(201);
    expect(res.body.scene.viewKey).toBe('main');

    const bads: Array<Record<string, string>> = [{ viewKey: 'Bad Key!' }, { viewDirection: 'sideways' }, { sortOrder: '-1' }, { sortOrder: '1.5' }];
    for (const bad of bads) {
      const r = await upload(base, auth, { targetType: 'building', targetId: enc(building._id), ...bad });
      expect(r.status).toBe(400);
    }
    expect(uploadImageMock).toHaveBeenCalledTimes(1); // validation happens before any upload
  });

  it('replaces the image of an existing view in place, reports aspect changes and deletes the old image', async () => {
    const { auth, base, building, unit } = await setup();
    nextImage(1600, 900);
    const first = await upload(base, auth, { targetType: 'building', targetId: enc(building._id), viewKey: 'front' });
    const sceneId = first.body.scene.id;
    await request(app)
      .patch(`${base}/scenes/${sceneId}/draft`)
      .set('Authorization', auth)
      .send({ hotspots: [hotspot({ linkId: enc(unit._id) })], baseVersion: 0 })
      .expect(200);

    nextImage(1600, 901); // < 1% change
    const same = await upload(base, auth, { targetType: 'building', targetId: enc(building._id), viewKey: 'front' });
    expect(same.status).toBe(200);
    expect(same.body.scene.id).toBe(sceneId);
    expect(same.body.aspectChanged).toBe(false);
    expect(same.body.scene.draft.hotspots).toHaveLength(1);
    expect(deleteImageMock).toHaveBeenCalledWith(first.body.scene.imagePublicId);

    nextImage(1000, 1000);
    const changed = await upload(base, auth, {
      targetType: 'building',
      targetId: enc(building._id),
      viewKey: 'front',
      clearHotspots: 'true',
    });
    expect(changed.body.aspectChanged).toBe(true);
    expect(changed.body.scene.draft.hotspots).toHaveLength(0);
    expect(changed.body.scene.draft.version).toBe(2);
    expect(await DevelopmentScene.countDocuments({ targetId: building._id, deletedAt: null })).toBe(1);
  });

  it('enforces viewKey uniqueness per target among live scenes (409 on a racing duplicate)', async () => {
    const { auth, base, building, dev } = await setup();
    await DevelopmentScene.syncIndexes();

    // A second live scene with the same (target, viewKey) is refused by the index…
    await DevelopmentScene.create({
      developmentId: dev._id,
      targetType: 'building',
      targetId: building._id,
      viewKey: 'front',
      imageUrl: 'https://cdn.test/a.jpg',
      imageWidth: 10,
      imageHeight: 10,
    });
    await expect(
      DevelopmentScene.create({
        developmentId: dev._id,
        targetType: 'building',
        targetId: building._id,
        viewKey: 'front',
        imageUrl: 'https://cdn.test/b.jpg',
        imageWidth: 10,
        imageHeight: 10,
      })
    ).rejects.toMatchObject({ code: 11000 });

    // …and two concurrent first uploads of a new view never produce two views:
    // the loser gets a 409 (or, if serialised, replaces the winner's image).
    nextImage();
    nextImage();
    const results = await Promise.all([
      upload(base, auth, { targetType: 'building', targetId: enc(building._id), viewKey: 'courtyard' }),
      upload(base, auth, { targetType: 'building', targetId: enc(building._id), viewKey: 'courtyard' }),
    ]);
    for (const r of results) expect([200, 201, 409]).toContain(r.status);
    const loser = results.find((r) => r.status === 409);
    if (loser) expect(loser.body.code).toBe('view_key_taken');
    expect(
      await DevelopmentScene.countDocuments({ targetId: building._id, viewKey: 'courtyard', deletedAt: null })
    ).toBe(1);
  });

  it('frees the viewKey when a view is soft-deleted', async () => {
    const { auth, base, building } = await setup();
    nextImage();
    const first = await upload(base, auth, { targetType: 'building', targetId: enc(building._id), viewKey: 'front' });
    await request(app).delete(`${base}/scenes/${first.body.scene.id}`).set('Authorization', auth).expect(200);
    expect(await DevelopmentAuditLog.countDocuments({ action: 'scene.delete' })).toBe(1);
    const deleted = await DevelopmentScene.findOne({ viewKey: 'front' });
    expect(deleted!.deletedAt).toBeInstanceOf(Date);

    nextImage();
    const again = await upload(base, auth, { targetType: 'building', targetId: enc(building._id), viewKey: 'front' });
    expect(again.status).toBe(201);
    expect(again.body.scene.id).not.toBe(first.body.scene.id);
  });

  it('404s a building/floor of another development and a foreign development target', async () => {
    const { auth, base, owner } = await setup();
    const other = await makeDevelopment(owner._id);

    const building = await upload(base, auth, { targetType: 'building', targetId: enc(other.building._id) });
    expect(building.status).toBe(404);
    const floor = await upload(base, auth, { targetType: 'floor', targetId: String(other.floor._id) });
    expect(floor.status).toBe(404);
    const devTarget = await upload(base, auth, { targetType: 'development', targetId: enc(other.dev._id) });
    expect(devTarget.status).toBe(404);
    const garbage = await upload(base, auth, { targetType: 'building', targetId: 'not-an-id' });
    expect(garbage.status).toBe(400);
    expect(uploadImageMock).not.toHaveBeenCalled();
  });
});

describe('PATCH /scenes/:sceneId/draft', () => {
  const sceneFor = async () => {
    const ctx = await setup();
    nextImage();
    const res = await upload(ctx.base, ctx.auth, { targetType: 'building', targetId: enc(ctx.building._id) });
    return { ...ctx, sceneId: res.body.scene.id as string, draftUrl: `${ctx.base}/scenes/${res.body.scene.id}/draft` };
  };

  it('stores valid hotspots with encoded linkIds (raw ObjectIds accepted) and bumps the version', async () => {
    const { auth, draftUrl, unit, floor, building } = await sceneFor();
    const res = await request(app)
      .patch(draftUrl)
      .set('Authorization', auth)
      .send({
        baseVersion: 0,
        hotspots: [
          hotspot({ id: 'u1', linkId: String(unit._id), label: 'Apt 1' }),
          hotspot({ id: 'u2', linkId: enc(unit._id), shape: 'rect', points: [[0.5, 0.5], [0.7, 0.8]] }),
          hotspot({ id: 'f1', linkType: 'floor', linkId: enc(floor._id), points: square(0.4, 0.1) }),
          hotspot({ id: 'b1', linkType: 'building', linkId: enc(building._id), points: square(0.1, 0.6) }),
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.scene.draft.version).toBe(1);
    expect(res.body.scene.draft.hotspots.map((h: { linkId: string }) => h.linkId)).toEqual([
      enc(unit._id),
      enc(unit._id),
      enc(floor._id),
      enc(building._id),
    ]);
    const audit = await DevelopmentAuditLog.findOne({ action: 'scene.draft' }).lean();
    expect(audit!.metadata).toMatchObject({ hotspotCount: 4, version: 1 });
    expect(JSON.stringify(audit!.metadata)).not.toContain('points');
  });

  it('rejects (never clamps) self-intersecting and out-of-bounds polygons with HotspotIssue errors', async () => {
    const { auth, draftUrl, unit, sceneId } = await sceneFor();
    const res = await request(app)
      .patch(draftUrl)
      .set('Authorization', auth)
      .send({
        hotspots: [
          hotspot({ id: 'ok', linkId: enc(unit._id) }),
          hotspot({ id: 'bow', linkId: enc(unit._id), points: [[0.1, 0.1], [0.5, 0.5], [0.5, 0.1], [0.1, 0.5]] }),
          hotspot({ id: 'out', linkId: enc(unit._id), points: [[0.1, 0.1], [1.2, 0.1], [0.5, 0.5]] }),
          hotspot({ id: 'tri', shape: 'hexagon', linkType: 'garage', linkId: enc(unit._id) }),
          hotspot({ id: '', label: 'x'.repeat(81), linkId: '' }),
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.any(String));
    const codes = res.body.errors.map((e: { index: number; code: string }) => `${e.index}:${e.code}`);
    expect(codes).toEqual(
      expect.arrayContaining([
        '1:self_intersecting',
        '2:out_of_bounds',
        '3:invalid_shape',
        '3:invalid_link_type',
        '4:invalid_id',
        '4:invalid_label',
        '4:missing_link',
      ])
    );
    expect(codes.some((c: string) => c.startsWith('0:'))).toBe(false);
    const issue = res.body.errors.find((e: { index: number }) => e.index === 1);
    expect(issue).toMatchObject({ hotspotId: 'bow', field: 'points', message: expect.any(String) });

    const stored = await DevelopmentScene.findOne({});
    expect(stored!.draft.hotspots).toHaveLength(0);
    expect(stored!.draft.version).toBe(0);
    expect(sceneId).toBeTruthy();
  });

  it('rejects links to another development, deleted entities and listings the caller cannot link', async () => {
    const { auth, draftUrl, owner, unit, dev, building, floor } = await sceneFor();
    const other = await makeDevelopment(owner._id);
    const deletedUnit = await DevelopmentUnit.create({
      developmentId: dev._id,
      buildingId: building._id,
      floorId: floor._id,
      unitNumber: 'GONE',
      unitType: 'apartment',
      deletedAt: new Date(),
    });
    const stranger = await makeUser();
    const strangersListing = await makeListing(stranger._id);
    const ownListing = await makeListing(owner._id, { status: 'draft' });
    const attachedListing = await makeListing(stranger._id);
    await DevelopmentUnit.updateOne({ _id: unit._id }, { $push: { listingIds: attachedListing._id } });

    const res = await request(app)
      .patch(draftUrl)
      .set('Authorization', auth)
      .send({
        hotspots: [
          hotspot({ id: 'foreign-unit', linkId: enc(other.unit._id) }),
          hotspot({ id: 'foreign-building', linkType: 'building', linkId: enc(other.building._id) }),
          hotspot({ id: 'deleted-unit', linkId: enc(deletedUnit._id) }),
          hotspot({ id: 'stranger-listing', linkType: 'listing', linkId: enc(strangersListing._id) }),
          hotspot({ id: 'own-listing', linkType: 'listing', linkId: enc(ownListing._id) }),
          hotspot({ id: 'attached-listing', linkType: 'listing', linkId: enc(attachedListing._id) }),
          hotspot({ id: 'junk', linkId: 'zzz' }),
        ],
      });
    expect(res.status).toBe(400);
    const rejected = res.body.errors.map((e: { hotspotId: string; code: string }) => `${e.hotspotId}:${e.code}`);
    expect(rejected.sort()).toEqual(
      [
        'foreign-unit:link_not_found',
        'foreign-building:link_not_found',
        'deleted-unit:link_not_found',
        'stranger-listing:link_not_found',
        'junk:link_not_found',
      ].sort()
    );
  });

  it('accepts a hidden unit in the draft (it is stripped from the public view instead)', async () => {
    const { auth, draftUrl, unit } = await sceneFor();
    await DevelopmentUnit.updateOne({ _id: unit._id }, { $set: { visibility: 'hidden' } });
    const res = await request(app)
      .patch(draftUrl)
      .set('Authorization', auth)
      .send({ hotspots: [hotspot({ linkId: enc(unit._id) })] });
    expect(res.status).toBe(200);
  });

  it('refuses more than MAX_HOTSPOTS_PER_SCENE regions', async () => {
    const { auth, draftUrl, unit } = await sceneFor();
    const many = Array.from({ length: 2001 }, (_, i) => hotspot({ id: `h${i}`, linkId: enc(unit._id) }));
    const res = await request(app).patch(draftUrl).set('Authorization', auth).send({ hotspots: many });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([expect.objectContaining({ code: 'too_many_hotspots' })]);
  });

  it('returns 409 version_conflict with currentVersion for a stale baseVersion', async () => {
    const { auth, draftUrl, unit } = await sceneFor();
    await request(app)
      .patch(draftUrl)
      .set('Authorization', auth)
      .send({ hotspots: [hotspot({ linkId: enc(unit._id) })], baseVersion: 0 })
      .expect(200);
    const stale = await request(app)
      .patch(draftUrl)
      .set('Authorization', auth)
      .send({ hotspots: [], baseVersion: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ code: 'version_conflict', currentVersion: 1, message: expect.any(String) });
  });

  it('lets exactly one of several concurrent saves from the same baseVersion win', async () => {
    const { auth, draftUrl, unit, sceneId } = await sceneFor();
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        request(app)
          .patch(draftUrl)
          .set('Authorization', auth)
          .send({ hotspots: [hotspot({ id: `writer-${i}`, linkId: enc(unit._id) })], baseVersion: 0 })
      )
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409, 409, 409, 409]);
    const scene = await DevelopmentScene.findOne({ deletedAt: null }).lean();
    expect(scene!.draft.version).toBe(1);
    expect(scene!.draft.hotspots).toHaveLength(1);
    expect(sceneId).toBeTruthy();
  });

  it('cannot reach a scene of another development through its sceneId', async () => {
    const a = await sceneFor();
    const b = await setup();
    // b's owner, a's sceneId, b's development in the path.
    const res = await request(app)
      .patch(`${b.base}/scenes/${a.sceneId}/draft`)
      .set('Authorization', b.auth)
      .send({ hotspots: [] });
    expect(res.status).toBe(404);
    const pub = await request(app).post(`${b.base}/scenes/${a.sceneId}/publish`).set('Authorization', b.auth);
    expect(pub.status).toBe(404);
    // and a's development path with b's credentials is a 403.
    const forbidden = await request(app)
      .patch(a.draftUrl)
      .set('Authorization', b.auth)
      .send({ hotspots: [] });
    expect(forbidden.status).toBe(403);
  });
});

describe('PATCH /scenes/:sceneId (meta) and permissions', () => {
  it('updates view name / direction / order and audits the diff', async () => {
    const { auth, base, building } = await setup();
    nextImage();
    const created = await upload(base, auth, { targetType: 'building', targetId: enc(building._id) });
    const res = await request(app)
      .patch(`${base}/scenes/${created.body.scene.id}`)
      .set('Authorization', auth)
      .send({ viewName: 'Courtyard', viewDirection: 'courtyard', sortOrder: 3 });
    expect(res.status).toBe(200);
    expect(res.body.scene).toMatchObject({ viewName: 'Courtyard', viewDirection: 'courtyard', sortOrder: 3 });
    const audit = await DevelopmentAuditLog.findOne({ action: 'scene.update' }).lean();
    expect(audit!.metadata).toMatchObject({ changes: { sortOrder: { from: 0, to: 3 } } });

    const bad = await request(app)
      .patch(`${base}/scenes/${created.body.scene.id}`)
      .set('Authorization', auth)
      .send({ viewDirection: 'up' });
    expect(bad.status).toBe(400);
  });

  it('gives a viewer (no scene.edit / publish) 403 on every scene mutation', async () => {
    const { auth, base, building, dev } = await setup();
    nextImage();
    const created = await upload(base, auth, { targetType: 'building', targetId: enc(building._id) });
    const sceneId = created.body.scene.id;

    const viewer = await makeUser();
    await DevelopmentMembership.create({ developmentId: dev._id, userId: viewer._id, role: 'viewer', status: 'active' });
    const v = tokenFor(viewer);

    expect((await upload(base, v, { targetType: 'building', targetId: enc(building._id) })).status).toBe(403);
    expect((await request(app).patch(`${base}/scenes/${sceneId}`).set('Authorization', v).send({ sortOrder: 1 })).status).toBe(403);
    expect((await request(app).patch(`${base}/scenes/${sceneId}/draft`).set('Authorization', v).send({ hotspots: [] })).status).toBe(403);
    expect((await request(app).post(`${base}/scenes/${sceneId}/publish`).set('Authorization', v)).status).toBe(403);
    expect((await request(app).post(`${base}/scenes/${sceneId}/unpublish`).set('Authorization', v)).status).toBe(403);
    expect((await request(app).delete(`${base}/scenes/${sceneId}`).set('Authorization', v)).status).toBe(403);
    // Reading is allowed for any member.
    expect((await request(app).get(`${base}/scenes`).set('Authorization', v)).status).toBe(200);
  });

  it('lets an editor save drafts but not publish', async () => {
    const { auth, base, building, dev } = await setup();
    nextImage();
    const created = await upload(base, auth, { targetType: 'building', targetId: enc(building._id) });
    const editor = await makeUser();
    await DevelopmentMembership.create({ developmentId: dev._id, userId: editor._id, role: 'editor', status: 'active' });
    const e = tokenFor(editor);
    const sceneId = created.body.scene.id;
    expect((await request(app).patch(`${base}/scenes/${sceneId}/draft`).set('Authorization', e).send({ hotspots: [] })).status).toBe(200);
    expect((await request(app).post(`${base}/scenes/${sceneId}/publish`).set('Authorization', e)).status).toBe(403);
  });
});
