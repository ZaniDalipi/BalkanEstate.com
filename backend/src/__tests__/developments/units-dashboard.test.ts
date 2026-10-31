/**
 * Dashboard unit administration over HTTP (real routers, real mongod):
 * list search/sort/pagination, field-level authorization on PATCH, encoded and
 * cross-development ids, soft delete, bulk edits and building/floor edits.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import Development from '../../models/Development';
import Property from '../../models/Property';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { buildApp, setupDevelopment, addMember, makeListing, linkListing, encodeId } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('GET /units (dashboard list)', () => {
  it('searches (escaped, case-insensitive), sorts naturally and paginates', async () => {
    const t = await setupDevelopment();
    for (const n of ['A2', 'A10', 'b3', 'C(1)']) {
      // eslint-disable-next-line no-await-in-loop
      await createUnit(t.devId, {
        buildingId: t.building._id,
        floorId: n === 'A10' ? t.floor2._id : t.floor._id,
        unitNumber: n,
        unitType: 'apartment',
        price: n === 'A10' ? 90000 : 200000,
      });
    }

    const all = await request(app).get(`${DASH}/${t.devEnc}/units?sort=unitNumber`).set(auth(t.ownerToken));
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(5);
    expect(all.body.units.map((u: { unitNumber: string }) => u.unitNumber)).toEqual(['A1', 'A2', 'A10', 'b3', 'C(1)']);

    const search = await request(app).get(`${DASH}/${t.devEnc}/units?search=a1`).set(auth(t.ownerToken));
    expect(search.body.units.map((u: { unitNumber: string }) => u.unitNumber).sort()).toEqual(['A1', 'A10']);

    // A regex metacharacter is matched literally, not as a pattern.
    const meta = await request(app).get(`${DASH}/${t.devEnc}/units?search=${encodeURIComponent('C(')}`).set(auth(t.ownerToken));
    expect(meta.status).toBe(200);
    expect(meta.body.units.map((u: { unitNumber: string }) => u.unitNumber)).toEqual(['C(1)']);

    const page = await request(app).get(`${DASH}/${t.devEnc}/units?sort=-unitNumber&limit=2&skip=1`).set(auth(t.ownerToken));
    expect(page.body.total).toBe(5);
    expect(page.body.units.map((u: { unitNumber: string }) => u.unitNumber)).toEqual(['b3', 'A10']);

    const byPrice = await request(app).get(`${DASH}/${t.devEnc}/units?sort=price&limit=1`).set(auth(t.ownerToken));
    expect(byPrice.body.units[0].unitNumber).toBe('A10');

    const byFloor = await request(app).get(`${DASH}/${t.devEnc}/units?sort=-floor&limit=1`).set(auth(t.ownerToken));
    expect(byFloor.body.units[0].unitNumber).toBe('A10');
    expect(byFloor.body.units[0].floorLevel).toBe(2);
    expect(byFloor.body.units[0].floorLabel).toBe('Floor 2');
    expect(byFloor.body.units[0].buildingName).toBe('Block A');

    const byBuilding = await request(app)
      .get(`${DASH}/${t.devEnc}/units?floorId=${t.enc(t.floor2._id)}`)
      .set(auth(t.ownerToken));
    expect(byBuilding.body.total).toBe(1);

    const bad = await request(app).get(`${DASH}/${t.devEnc}/units?sort=hack`).set(auth(t.ownerToken));
    expect(bad.status).toBe(400);
  });

  it('returns effective availability and encoded linked listings', async () => {
    const t = await setupDevelopment();
    const listing = await makeListing(t.owner._id, { status: 'pending', title: 'Pending flat' });
    await linkListing(t.unit, listing._id, true);

    const res = await request(app).get(`${DASH}/${t.devEnc}/units`).set(auth(t.ownerToken));
    const u = res.body.units[0];
    expect(u.availability).toBe('available');
    expect(u.effectiveAvailability).toBe('reserved');
    expect(u.availabilitySource).toBe('listing');
    expect(u.linkedListings).toEqual([{ id: encodeId(String(listing._id)), title: 'Pending flat', status: 'pending', hasTour: false }]);
    expect(u.id).toBe(encodeId(String(t.unit._id)));
  });
});

describe('PATCH /units/:unitId', () => {
  it('enforces field-level authorization (editor: unitNumber yes, price no)', async () => {
    const t = await setupDevelopment();
    const editor = await addMember(t.devId, 'editor');
    const url = `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`;

    const denied = await request(app).patch(url).set(auth(editor.token)).send({ price: 1 });
    expect(denied.status).toBe(403);
    // Mixed payload: any denied group rejects the whole request.
    const mixed = await request(app).patch(url).set(auth(editor.token)).send({ unitNumber: 'Z9', price: 1 });
    expect(mixed.status).toBe(403);
    expect((await DevelopmentUnit.findById(t.unit._id))!.unitNumber).toBe('A1');

    const ok = await request(app).patch(url).set(auth(editor.token)).send({ unitNumber: 'A1-bis' });
    expect(ok.status).toBe(200);
    expect(ok.body.unit.unitNumber).toBe('A1-bis');
    expect(ok.body.unit.effectiveAvailability).toBeDefined();

    const agent = await addMember(t.devId, 'sales_agent');
    expect((await request(app).patch(url).set(auth(agent.token)).send({ beds: 3 })).status).toBe(403);
    expect((await request(app).patch(url).set(auth(agent.token)).send({ availability: 'reserved' })).status).toBe(200);

    const viewer = await addMember(t.devId, 'viewer');
    expect((await request(app).patch(url).set(auth(viewer.token)).send({ availability: 'sold' })).status).toBe(403);
  });

  it('validates values, clears with null, and audits unit.update + price.change', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`;

    expect((await request(app).patch(url).set(auth(t.ownerToken)).send({ beds: -1 })).status).toBe(400);
    expect((await request(app).patch(url).set(auth(t.ownerToken)).send({ beds: '3' })).status).toBe(400);
    expect((await request(app).patch(url).set(auth(t.ownerToken)).send({ visibility: 'secret' })).status).toBe(400);
    expect((await request(app).patch(url).set(auth(t.ownerToken)).send({ availability: 'gone' })).status).toBe(400);
    expect((await request(app).patch(url).set(auth(t.ownerToken)).send({ features: ['duplex', 'helipad'] })).status).toBe(400);

    const res = await request(app)
      .patch(url)
      .set(auth(t.ownerToken))
      .send({ price: 175000, beds: 2, features: ['duplex', 'duplex'], description: 'Sunny', currency: null });
    expect(res.status).toBe(200);
    expect(res.body.unit.price).toBe(175000);
    expect(res.body.unit.features).toEqual(['duplex']);
    expect(res.body.unit.currency).toBeUndefined();

    const cleared = await request(app).patch(url).set(auth(t.ownerToken)).send({ beds: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.unit.beds).toBeUndefined();

    const audits = await DevelopmentAuditLog.find({ developmentId: t.devId }).lean();
    const update = audits.find((a) => a.action === 'unit.update');
    expect(update).toBeDefined();
    expect((update!.metadata as { changes: Record<string, unknown> }).changes.price).toEqual({ from: 150000, to: 175000 });
    const price = audits.find((a) => a.action === 'price.change');
    expect(price!.metadata).toMatchObject({ from: 150000, to: 175000 });
  });

  it('availability change via PATCH recomputes stats (shared transition path)', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`;
    expect((await Development.findById(t.devId))!.stats.available).toBe(1);
    const res = await request(app).patch(url).set(auth(t.ownerToken)).send({ availability: 'sold' });
    expect(res.status).toBe(200);
    expect((await Development.findById(t.devId))!.stats.available).toBe(0);
    expect(await DevelopmentAuditLog.countDocuments({ action: 'availability.change' })).toBe(1);
  });

  it('moves a unit only to a floor of the target building, within the development', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`;

    const moved = await request(app).patch(url).set(auth(t.ownerToken)).send({ floorId: t.enc(t.floor2._id) });
    expect(moved.status).toBe(200);
    expect(moved.body.unit.floorId).toBe(t.enc(t.floor2._id));

    // Another development's floor / building: not found here.
    expect((await request(app).patch(url).set(auth(t.ownerToken)).send({ floorId: other.enc(other.floor._id) })).status).toBe(404);
    expect((await request(app).patch(url).set(auth(t.ownerToken)).send({ buildingId: other.enc(other.building._id) })).status).toBe(404);

    // A second building in the same development whose floor does not match.
    const b2 = await request(app).post(`${DASH}/${t.devEnc}/buildings`).set(auth(t.ownerToken)).send({ name: 'Block B' });
    const mismatch = await request(app).patch(url).set(auth(t.ownerToken)).send({ buildingId: b2.body.building.id });
    expect(mismatch.status).toBe(400);
  });

  it('404s a unit id that belongs to another development', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    const res = await request(app)
      .patch(`${DASH}/${t.devEnc}/units/${other.enc(other.unit._id)}`)
      .set(auth(t.ownerToken))
      .send({ unitNumber: 'X' });
    expect(res.status).toBe(404);
    expect((await DevelopmentUnit.findById(other.unit._id))!.unitNumber).toBe('A1');
  });

  it('409s a duplicate unit number in the same building', async () => {
    const t = await setupDevelopment();
    await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'A2', unitType: 'apartment' });
    const res = await request(app)
      .patch(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`)
      .set(auth(t.ownerToken))
      .send({ unitNumber: 'A2' });
    expect(res.status).toBe(409);
  });
});

describe('POST /floors and /units with encoded ids', () => {
  it('resolves encoded building/floor ids (no 500) and checks floor ∈ building', async () => {
    const t = await setupDevelopment();
    const floor = await request(app)
      .post(`${DASH}/${t.devEnc}/floors`)
      .set(auth(t.ownerToken))
      .send({ buildingId: t.enc(t.building._id), label: 'Floor 3', level: 3 });
    expect(floor.status).toBe(201);
    expect(floor.body.floor.buildingId).toBe(t.enc(t.building._id));

    const unit = await request(app)
      .post(`${DASH}/${t.devEnc}/units`)
      .set(auth(t.ownerToken))
      .send({ buildingId: t.enc(t.building._id), floorId: floor.body.floor.id, unitNumber: 'C1', unitType: 'apartment' });
    expect(unit.status).toBe(201);
    expect(unit.body.unit.floorId).toBe(floor.body.floor.id);

    const b2 = await request(app).post(`${DASH}/${t.devEnc}/buildings`).set(auth(t.ownerToken)).send({ name: 'Block B' });
    const mismatch = await request(app)
      .post(`${DASH}/${t.devEnc}/units`)
      .set(auth(t.ownerToken))
      .send({ buildingId: b2.body.building.id, floorId: floor.body.floor.id, unitNumber: 'C2', unitType: 'apartment' });
    expect(mismatch.status).toBe(400);

    const garbage = await request(app)
      .post(`${DASH}/${t.devEnc}/floors`)
      .set(auth(t.ownerToken))
      .send({ buildingId: 'not-an-id!', label: 'X', level: 1 });
    expect(garbage.status).toBe(400);
  });

  it('refuses another development’s building/floor (404)', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    const floor = await request(app)
      .post(`${DASH}/${t.devEnc}/floors`)
      .set(auth(t.ownerToken))
      .send({ buildingId: other.enc(other.building._id), label: 'Evil', level: 9 });
    expect(floor.status).toBe(404);
    const unit = await request(app)
      .post(`${DASH}/${t.devEnc}/units`)
      .set(auth(t.ownerToken))
      .send({ buildingId: other.enc(other.building._id), floorId: other.enc(other.floor._id), unitNumber: 'E1', unitType: 'apartment' });
    expect(unit.status).toBe(404);
    expect(await DevelopmentFloor.countDocuments({ buildingId: other.building._id })).toBe(2);
  });
});

describe('DELETE /units/:unitId', () => {
  it('soft-deletes, recomputes stats, clears unit refs on listings, and audits', async () => {
    const t = await setupDevelopment();
    const listing = await makeListing(t.owner._id, {
      developmentId: t.devId,
      buildingId: t.building._id,
      floorId: t.floor._id,
      unitId: t.unit._id,
    });
    await linkListing(t.unit, listing._id, true);
    const res = await request(app).delete(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`).set(auth(t.ownerToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect((await DevelopmentUnit.findById(t.unit._id))!.deletedAt).toBeInstanceOf(Date);
    expect((await Development.findById(t.devId))!.stats.units).toBe(0);
    const p = await Property.findById(listing._id);
    expect(p!.unitId).toBeFalsy();
    expect(String(p!.developmentId)).toBe(String(t.devId));
    expect(await DevelopmentAuditLog.countDocuments({ action: 'unit.delete' })).toBe(1);

    const list = await request(app).get(`${DASH}/${t.devEnc}/units`).set(auth(t.ownerToken));
    expect(list.body.total).toBe(0);
  });

  it('needs unit.manage', async () => {
    const t = await setupDevelopment();
    const agent = await addMember(t.devId, 'sales_agent');
    const res = await request(app).delete(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`).set(auth(agent.token));
    expect(res.status).toBe(403);
  });
});

describe('POST /units/bulk', () => {
  it('updates only units of this development in one call', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    const u2 = await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'A2', unitType: 'apartment' });
    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/units/bulk`)
      .set(auth(t.ownerToken))
      .send({ unitIds: [t.enc(t.unit._id), t.enc(u2._id), other.enc(other.unit._id)], availability: 'reserved', visibility: 'hidden' });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    const mine = await DevelopmentUnit.find({ developmentId: t.devId });
    expect(mine.every((u) => u.availability === 'reserved' && u.visibility === 'hidden')).toBe(true);
    const theirs = await DevelopmentUnit.findById(other.unit._id);
    expect(theirs!.availability).toBe('available');
    expect(theirs!.visibility).toBe('public');
    expect((await Development.findById(t.devId))!.stats.available).toBe(0);
    expect(await DevelopmentAuditLog.countDocuments({ developmentId: t.devId, action: 'unit.bulk_update' })).toBe(1);
  });

  it('applies field-level authz and limits', async () => {
    const t = await setupDevelopment();
    const agent = await addMember(t.devId, 'sales_agent');
    const url = `${DASH}/${t.devEnc}/units/bulk`;
    const ids = [t.enc(t.unit._id)];
    expect((await request(app).post(url).set(auth(agent.token)).send({ unitIds: ids, visibility: 'hidden' })).status).toBe(403);
    expect((await request(app).post(url).set(auth(agent.token)).send({ unitIds: ids, availability: 'sold' })).status).toBe(200);
    const tooMany = Array.from({ length: 501 }, () => encodeId(String(new mongoose.Types.ObjectId())));
    expect((await request(app).post(url).set(auth(t.ownerToken)).send({ unitIds: tooMany, availability: 'sold' })).status).toBe(400);
    expect((await request(app).post(url).set(auth(t.ownerToken)).send({ unitIds: ['bad id'], availability: 'sold' })).status).toBe(400);
    expect((await request(app).post(url).set(auth(t.ownerToken)).send({ unitIds: ids })).status).toBe(400);
  });
});

describe('PATCH /buildings/:id and /floors/:id', () => {
  it('updates validated fields, audits, and 404s other developments', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    const b = await request(app)
      .patch(`${DASH}/${t.devEnc}/buildings/${t.enc(t.building._id)}`)
      .set(auth(t.ownerToken))
      .send({ name: 'Tower A', totalFloors: 12, code: null });
    expect(b.status).toBe(200);
    expect(b.body.building.name).toBe('Tower A');
    expect(b.body.building.totalFloors).toBe(12);
    expect((await request(app).patch(`${DASH}/${t.devEnc}/buildings/${t.enc(t.building._id)}`).set(auth(t.ownerToken)).send({ totalFloors: -2 })).status).toBe(400);
    expect((await request(app).patch(`${DASH}/${t.devEnc}/buildings/${other.enc(other.building._id)}`).set(auth(t.ownerToken)).send({ name: 'X' })).status).toBe(404);

    const f = await request(app)
      .patch(`${DASH}/${t.devEnc}/floors/${t.enc(t.floor._id)}`)
      .set(auth(t.ownerToken))
      .send({ label: 'Ground', level: 0, kind: 'ground' });
    expect(f.status).toBe(200);
    expect(f.body.floor).toMatchObject({ label: 'Ground', level: 0, kind: 'ground' });
    expect((await request(app).patch(`${DASH}/${t.devEnc}/floors/${t.enc(t.floor._id)}`).set(auth(t.ownerToken)).send({ kind: 'attic' })).status).toBe(400);
    expect((await request(app).patch(`${DASH}/${t.devEnc}/floors/${other.enc(other.floor._id)}`).set(auth(t.ownerToken)).send({ level: 4 })).status).toBe(404);

    expect(await DevelopmentAuditLog.countDocuments({ developmentId: t.devId, action: 'building.update' })).toBe(1);
    expect(await DevelopmentAuditLog.countDocuments({ developmentId: t.devId, action: 'floor.update' })).toBe(1);
  });
});
