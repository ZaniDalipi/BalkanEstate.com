/** Entrances: added, changed and removed with codes; units assigned; imported; shown to buyers with what they serve. */
import request from 'supertest';
import DevelopmentEntrance from '../../models/DevelopmentEntrance';
import DevelopmentScene from '../../models/DevelopmentScene';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import { createBuilding, createUnit } from '../../services/developments/developmentInventoryService';
import { normalizeEntranceInput } from '../../services/developments/entranceRules';
import { addMember, buildApp, setupDevelopment } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const PUB = '/api/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const refused = (res: request.Response, status: number, code: string, field?: string, params?: object) => {
  expect(res.status).toBe(status);
  expect(res.body.code).toBe(code);
  if (field) expect(res.body.details?.field).toBe(field);
  if (params) expect(res.body.details?.params).toMatchObject(params);
};

describe('normalizeEntranceInput', () => {
  it('trims, keeps kinds and access, clears blank text, and names each bad field', () => {
    expect(normalizeEntranceInput({ name: ' Entrance A ', kind: 'garage', accessible: true, note: ' ', code: 'A' }, 'create')).toMatchObject({
      $set: { name: 'Entrance A', kind: 'garage', accessible: true, code: 'A' },
      $unset: { note: '' },
    });
    const fails = (body: object, mode: 'create' | 'update' = 'create') => {
      try {
        normalizeEntranceInput(body, mode);
        return null;
      } catch (e) {
        return { code: (e as { code: string }).code, field: (e as { details?: { field?: string } }).details?.field };
      }
    };
    expect(fails({})).toEqual({ code: 'FIELD_REQUIRED', field: 'name' });
    expect(fails({ name: 'x'.repeat(121) })).toEqual({ code: 'FIELD_TOO_LONG', field: 'name' });
    expect(fails({ name: 'A', kind: 'roof' })).toEqual({ code: 'FIELD_INVALID', field: 'kind' });
    expect(fails({ name: 'A', accessible: 'yes' })).toEqual({ code: 'FIELD_INVALID', field: 'accessible' });
    expect(fails({ name: 'A', note: 'n'.repeat(201) })).toEqual({ code: 'FIELD_TOO_LONG', field: 'note' });
    expect(fails({}, 'update')).toEqual({ code: 'NO_CHANGES', field: undefined });
  });
});

describe('managing entrances', () => {
  it('adds, renames and removes one; refuses duplicates, viewers, and removing one apartments still use', async () => {
    const t = await setupDevelopment({ published: true });
    const base = `${DASH}/${t.devEnc}`;
    const add = (body: object, token = t.ownerToken, building = t.enc(t.building._id)) =>
      request(app).post(`${base}/buildings/${building}/entrances`).set(auth(token)).send(body);

    const a = await add({ name: 'Entrance A', kind: 'main', accessible: true, note: 'From Rruga e Kavajës' });
    expect(a.status).toBe(201);
    expect(a.body.entrance).toMatchObject({ name: 'Entrance A', kind: 'main', accessible: true, order: 0 });
    const b = await add({ name: 'Garage', kind: 'garage' });
    expect(b.body.entrance.order).toBe(1);

    refused(await add({ name: ' entrance a ' }), 409, 'ENTRANCE_NAME_TAKEN', 'name', { name: 'entrance a' });
    refused(await add({ name: 'Side', kind: 'window' }), 400, 'FIELD_INVALID', 'kind');
    refused(await add({ name: 'X' }, t.ownerToken, 'notAnId'), 400, 'FIELD_INVALID', 'buildingId');
    const viewer = await addMember(t.devId, 'viewer');
    expect((await add({ name: 'Back' }, viewer.token)).status).toBe(403);

    const aId = a.body.entrance.id;
    const renamed = await request(app).patch(`${base}/entrances/${aId}`).set(auth(t.ownerToken)).send({ name: 'Main door', note: null });
    expect(renamed.status).toBe(200);
    expect(renamed.body.entrance).toMatchObject({ name: 'Main door' });
    expect(renamed.body.entrance.note).toBeUndefined();
    refused(await request(app).patch(`${base}/entrances/${aId}`).set(auth(t.ownerToken)).send({ name: 'garage' }), 409, 'ENTRANCE_NAME_TAKEN', 'name');

    // Assign the apartment to it; an entrance of another building is refused.
    const other = await createBuilding(t.devId, { name: 'Block B' });
    const otherEntrance = await add({ name: 'B1' }, t.ownerToken, t.enc(other._id));
    const unitUrl = `${base}/units/${t.enc(t.unit._id)}`;
    refused(await request(app).patch(unitUrl).set(auth(t.ownerToken)).send({ entranceId: otherEntrance.body.entrance.id }), 400, 'ENTRANCE_NOT_IN_BUILDING', 'entranceId');
    expect((await request(app).patch(unitUrl).set(auth(t.ownerToken)).send({ entranceId: aId })).status).toBe(200);
    expect(String((await DevelopmentUnit.findById(t.unit._id).lean())?.entranceId)).toBe(String(a.body.entrance._id ?? (await DevelopmentEntrance.findOne({ name: 'Main door' }))?._id));

    refused(await request(app).delete(`${base}/entrances/${aId}`).set(auth(t.ownerToken)), 409, 'ENTRANCE_IN_USE', undefined, { count: 1 });

    // Out of the entrance, then it can go, and its marked region goes with it.
    expect((await request(app).patch(unitUrl).set(auth(t.ownerToken)).send({ entranceId: null })).status).toBe(200);
    await DevelopmentScene.create({
      developmentId: t.devId, targetType: 'development', targetId: t.devId, imageUrl: 'https://cdn.example.com/s.webp', imageWidth: 100, imageHeight: 100,
      draft: { hotspots: [{ id: 'h1', shape: 'rect', points: [[0.1, 0.1], [0.2, 0.2]], linkType: 'entrance', linkId: aId }], version: 1 },
    });
    const del = await request(app).delete(`${base}/entrances/${aId}`).set(auth(t.ownerToken));
    expect(del.status).toBe(200);
    expect(del.body.regionsRemoved).toBe(1);
    expect((await DevelopmentScene.findOne({ developmentId: t.devId }).lean())?.draft?.hotspots).toHaveLength(0);
    expect(await DevelopmentAuditLog.countDocuments({ developmentId: t.devId, action: { $in: ['entrance.create', 'entrance.update', 'entrance.delete'] } })).toBe(5);
  });
});

describe('entrances for buyers', () => {
  it('lists each entrance with the homes it serves, and names it on the apartment', async () => {
    const t = await setupDevelopment({ published: true });
    const entrance = await DevelopmentEntrance.create({ developmentId: t.devId, buildingId: t.building._id, name: 'Entrance A', kind: 'main', accessible: true });
    await DevelopmentUnit.updateOne({ _id: t.unit._id }, { $set: { entranceId: entrance._id, availability: 'available', visibility: 'public' } });
    await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor2._id, entranceId: entrance._id, unitNumber: 'A2', unitType: 'apartment', availability: 'sold', visibility: 'public' });

    const detail = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(detail.status).toBe(200);
    const [pub] = detail.body.entrances;
    expect(pub).toMatchObject({ name: 'Entrance A', kind: 'main', accessible: true, stats: { units: 2, available: 1 } });
    expect(pub).not.toHaveProperty('deletedAt');
    expect(pub).not.toHaveProperty('developmentId');

    const units = await request(app).get(`${PUB}/${t.dev.slug}/units`);
    expect(units.body.units.find((u: { unitNumber: string }) => u.unitNumber === 'A1')).toMatchObject({ entranceName: 'Entrance A' });
  });
});

describe('importing with an Entrance column', () => {
  it('creates missing entrances, keeps repeated numbers apart per entrance, and moves an apartment without one into it', async () => {
    const t = await setupDevelopment();
    const post = (rows: object[], dryRun = false) =>
      request(app).post(`${DASH}/${t.devEnc}/units/import`).set(auth(t.ownerToken)).send({ rows, dryRun, updateExisting: true });
    const rows = [
      { row: 2, building: 'Block A', entrance: 'Entrance 1', level: 1, unitNumber: 'A1', fields: {} },
      { row: 3, building: 'Block A', entrance: 'Entrance 2', level: 1, unitNumber: 'A1', fields: { beds: 3 } },
      { row: 4, building: 'Block A', entrance: 'Entrance 2', level: 1, unitNumber: 'a1', fields: {} },
    ];
    const preview = await post(rows, true);
    expect(preview.body).toMatchObject({ entrancesCreated: ['Block A · Entrance 1', 'Block A · Entrance 2'], unitsCreated: 1, unitsUpdated: 1 });
    expect(preview.body.errors).toEqual([expect.objectContaining({ row: 4, code: 'IMPORT_DUPLICATE_ROW' })]);
    expect(await DevelopmentEntrance.countDocuments({ developmentId: t.devId })).toBe(0);

    const res = await post(rows);
    expect(res.status).toBe(200);
    const [e1, e2] = await DevelopmentEntrance.find({ developmentId: t.devId }).sort({ order: 1 }).lean();
    expect([e1.name, e2.name]).toEqual(['Entrance 1', 'Entrance 2']);
    const a1s = await DevelopmentUnit.find({ developmentId: t.devId, unitNumber: 'A1' }).lean();
    expect(a1s.map((u) => String(u.entranceId)).sort()).toEqual([String(e1._id), String(e2._id)].sort());
    expect(String(a1s.find((u) => String(u._id) === String(t.unit._id))?.entranceId)).toBe(String(e1._id));
  });
});
