/**
 * Units sold together: an apartment comes with a parking spot / storage room
 * (units of their own). Linking from the dashboard, the rules, and what the
 * public explorer sees in both directions.
 */
import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { setResidenceStatus } from '../../services/developments/billing/residenceBillingService';
import { buildApp, setupDevelopment } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const PUB = '/api/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await DevelopmentUnit.syncIndexes();
});

const setup = async () => {
  const t = await setupDevelopment();
  const spot = (n: string, unitType = 'parking', extra: Record<string, unknown> = {}) =>
    createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: n, unitType, price: 15000, availability: 'available', ...extra } as never);
  const p1 = await spot('P1');
  const p2 = await spot('P2');
  const s1 = await spot('S1', 'storage');
  const a2 = await spot('A2', 'apartment');
  await setResidenceStatus(t.dev, 'published');
  const patch = (unitId: unknown, body: Record<string, unknown>) =>
    request(app).patch(`${DASH}/${t.devEnc}/units/${t.enc(unitId)}`).set(auth(t.ownerToken)).send(body);
  return { ...t, p1, p2, s1, a2, patch };
};

describe('linking units from the dashboard', () => {
  it('an apartment comes with a parking spot and a storage room', async () => {
    const t = await setup();
    const res = await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id), t.enc(t.s1._id)] });
    expect(res.status).toBe(200);
    expect(res.body.unit.linkedUnitIds).toEqual([t.enc(t.p1._id), t.enc(t.s1._id)]);
    expect((await t.patch(t.unit._id, { linkedUnitIds: null })).status).toBe(200);
    expect((await DevelopmentUnit.findById(t.unit._id))!.linkedUnitIds).toHaveLength(0);
  });

  it('refuses what cannot be sold with an apartment', async () => {
    const t = await setup();
    const other = await setupDevelopment();
    const many = Array.from({ length: 11 }, () => t.enc(t.p1._id));
    const cases: Array<[unknown, string]> = [
      [[t.enc(t.a2._id)], 'LINKS_NOT_EXTRA'],
      [[t.enc(t.unit._id)], 'LINKS_SELF'],
      [[t.enc(other.unit._id)], 'LINKS_NOT_FOUND'],
      ['P1', 'LINKS_NOT_LIST'],
      [['not-an-id'], 'LINKS_INVALID_ID'],
    ];
    for (const [linkedUnitIds, code] of cases) {
      const res = await t.patch(t.unit._id, { linkedUnitIds });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code, details: { field: 'linkedUnitIds' } });
    }
    // Duplicates collapse to one, so eleven copies of one spot are fine; eleven different ones are not.
    expect((await t.patch(t.unit._id, { linkedUnitIds: many })).status).toBe(200);
  });

  it('a parking spot cannot come with anything, and stays a parking spot while linked', async () => {
    const t = await setup();
    const spotWithSpot = await t.patch(t.p1._id, { linkedUnitIds: [t.enc(t.p2._id)] });
    expect(spotWithSpot.status).toBe(400);
    expect(spotWithSpot.body.code).toBe('LINKS_EXTRA_CANNOT_HAVE');
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    const res = await t.patch(t.p1._id, { unitType: 'apartment' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'TYPE_SOLD_WITH', details: { field: 'unitType', params: { owner: 'A1' } } });
    const toParking = await t.patch(t.unit._id, { unitType: 'parking' });
    expect(toParking.status).toBe(400);
    expect(toParking.body).toMatchObject({ code: 'TYPE_EXTRA_HAS_LINKS', details: { field: 'unitType' } });
  });

  it('a spot comes with one apartment only, even when two save at once', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    const taken = await t.patch(t.a2._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: 'LINKS_TAKEN', details: { field: 'linkedUnitIds', params: { unit: 'P1', owner: 'A1' } } });

    const [x, y] = await Promise.all([
      t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p2._id)] }),
      t.patch(t.a2._id, { linkedUnitIds: [t.enc(t.p2._id)] }),
    ]);
    expect([x.status, y.status].sort()).toEqual([200, 409]);
    expect(await DevelopmentUnit.countDocuments({ linkedUnitIds: t.p2._id })).toBe(1);
  });

  it('deleting the spot removes it from the apartment; deleting the apartment frees the spot', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id), t.enc(t.p2._id)] });
    expect((await request(app).delete(`${DASH}/${t.devEnc}/units/${t.enc(t.p1._id)}`).set(auth(t.ownerToken))).status).toBeLessThan(300);
    expect((await DevelopmentUnit.findById(t.unit._id))!.linkedUnitIds.map(String)).toEqual([String(t.p2._id)]);

    expect((await request(app).delete(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`).set(auth(t.ownerToken))).status).toBeLessThan(300);
    expect((await t.patch(t.a2._id, { linkedUnitIds: [t.enc(t.p2._id)] })).status).toBe(200);
  });
});

describe('the dashboard list for the editor', () => {
  it('lists parking spots and storage rooms with the unit each comes with; errors name the field', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    const res = await request(app).get(`${DASH}/${t.devEnc}/units?unitType=parking,storage&limit=200`).set(auth(t.ownerToken));
    expect(res.status).toBe(200);
    const byNumber = new Map((res.body.units as Array<{ unitNumber: string; soldWith: unknown }>).map((u) => [u.unitNumber, u.soldWith]));
    expect([...byNumber.keys()].sort()).toEqual(['P1', 'P2', 'S1']);
    expect(byNumber.get('P1')).toEqual([{ id: t.enc(t.unit._id), unitNumber: 'A1' }]);
    expect(byNumber.get('P2')).toEqual([]);

    const bad = await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.a2._id)] });
    expect(bad.body).toMatchObject({ code: 'LINKS_NOT_EXTRA', details: { field: 'linkedUnitIds', params: { unit: 'A2', type: 'apartment' } } });
    const taken = await t.patch(t.a2._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    expect(taken.body).toMatchObject({ code: 'LINKS_TAKEN', details: { field: 'linkedUnitIds' } });
  });
});

describe('selling the apartment: the seller decides about its parking', () => {
  const statusOf = async (id: unknown) => (await DevelopmentUnit.findById(id))!.availability;

  it('only the spots the seller picks take the new status', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id), t.enc(t.p2._id)] });

    expect((await t.patch(t.unit._id, { availability: 'reserved' })).status).toBe(200);
    expect(await statusOf(t.p1._id)).toBe('available');

    const res = await t.patch(t.unit._id, { availability: 'sold', alsoLinkedUnitIds: [t.enc(t.p1._id)] });
    expect(res.status).toBe(200);
    expect(await statusOf(t.unit._id)).toBe('sold');
    expect(await statusOf(t.p1._id)).toBe('sold');
    expect(await statusOf(t.p2._id)).toBe('available');
    const audit = await DevelopmentAuditLog.findOne({ targetId: t.p1._id, action: 'availability.change' }).lean();
    expect(audit?.metadata).toMatchObject({ availability: 'sold', from: 'available', with: 'A1' });
  });

  it('refuses spots it does not come with, and spots without a change of status', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    const other = await t.patch(t.unit._id, { availability: 'sold', alsoLinkedUnitIds: [t.enc(t.p2._id)] });
    expect(other.status).toBe(400);
    expect(other.body).toMatchObject({ code: 'ALSO_LINKED_NOT_LINKED', details: { field: 'alsoLinkedUnitIds' } });
    expect(await statusOf(t.unit._id)).toBe('available'); // nothing written
    const noChange = await t.patch(t.unit._id, { description: 'x', alsoLinkedUnitIds: [t.enc(t.p1._id)] });
    expect(noChange.status).toBe(400);
    expect(noChange.body.code).toBe('ALSO_LINKED_NEEDS_STATUS');
    const notList = await t.patch(t.unit._id, { availability: 'sold', alsoLinkedUnitIds: 'P1' });
    expect(notList.body.code).toBe('ALSO_LINKED_NOT_LIST');
  });

  it('bulk: their parking follows only when asked', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    const bulk = (body: Record<string, unknown>) =>
      request(app).post(`${DASH}/${t.devEnc}/units/bulk`).set(auth(t.ownerToken)).send({ unitIds: [t.enc(t.unit._id)], ...body });
    expect((await bulk({ availability: 'reserved' })).status).toBe(200);
    expect(await statusOf(t.p1._id)).toBe('available');
    const res = await bulk({ availability: 'sold', includeLinked: true });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(2);
    expect(await statusOf(t.p1._id)).toBe('sold');
    expect((await bulk({ availability: 'sold', includeLinked: 'yes' })).status).toBe(400);
  });
});

describe('what buyers see', () => {
  it('both directions in the unit list, and companions on the detail', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    const list = (await request(app).get(`${PUB}/${t.dev.slug}/units`)).body.units as Array<Record<string, unknown>>;
    const byId = new Map(list.map((u) => [u.id, u]));
    expect(byId.get(t.enc(t.unit._id))).toMatchObject({ linkedUnitIds: [t.enc(t.p1._id)], soldWithUnitIds: [] });
    expect(byId.get(t.enc(t.p1._id))).toMatchObject({ linkedUnitIds: [], soldWithUnitIds: [t.enc(t.unit._id)] });

    const apt = (await request(app).get(`${PUB}/${t.dev.slug}/units/${t.enc(t.unit._id)}`)).body;
    expect(apt.companions).toEqual([expect.objectContaining({ relation: 'comes_with', unit: expect.objectContaining({ unitNumber: 'P1', unitType: 'parking', price: 15000 }) })]);
    const spot = (await request(app).get(`${PUB}/${t.dev.slug}/units/${t.enc(t.p1._id)}`)).body;
    expect(spot.companions).toEqual([expect.objectContaining({ relation: 'sold_with', unit: expect.objectContaining({ unitNumber: 'A1' }) })]);
  });

  it('a hidden spot is never mentioned', async () => {
    const t = await setup();
    await t.patch(t.unit._id, { linkedUnitIds: [t.enc(t.p1._id)] });
    await DevelopmentUnit.updateOne({ _id: t.p1._id }, { $set: { visibility: 'hidden' } });
    const list = (await request(app).get(`${PUB}/${t.dev.slug}/units`)).body.units as Array<Record<string, unknown>>;
    const apt = list.find((u) => u.id === t.enc(t.unit._id));
    expect(apt?.linkedUnitIds).toEqual([]);
    const detail = (await request(app).get(`${PUB}/${t.dev.slug}/units/${t.enc(t.unit._id)}`)).body;
    expect(detail.companions).toEqual([]);
    expect(JSON.stringify(detail)).not.toContain(t.enc(t.p1._id));
  });
});
