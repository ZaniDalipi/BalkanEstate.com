import request from 'supertest';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import { importUnits, MAX_IMPORT_ROWS } from '../../services/developments/unitImportService';
import { buildApp, setupDevelopment, addMember } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const rows = [
  { row: 2, building: 'Block A', level: 1, unitNumber: 'A1', fields: { price: 160000, availability: 'available' } },
  { row: 3, building: 'Block A', level: 2, floorLabel: 'Floor 2', unitNumber: 'A201', fields: { beds: 2, totalArea: 74.5, unitType: 'apartment', currency: 'eur' }, features: ['corner', 'bogus'] },
  { row: 4, building: 'Tower B', level: 0, unitNumber: 'B001', fields: { unitType: 'retail', availability: 'reserved' } },
  { row: 5, building: 'Tower B', level: 0, unitNumber: 'b001', fields: {} },
  { row: 6, building: 'Tower B', level: 3, unitNumber: 'B301', fields: { availability: 'free' } },
];

describe('units import', () => {
  it('previews without writing, then creates buildings, floors and units and updates existing ones', async () => {
    const t = await setupDevelopment();
    const post = (body: object) => request(app).post(`${DASH}/${t.devEnc}/units/import`).set(auth(t.ownerToken)).send(body);

    const preview = await post({ rows, dryRun: true });
    expect(preview.status).toBe(200);
    expect(preview.body).toMatchObject({ dryRun: true, buildingsCreated: ['Tower B'], floorsCreated: 1, unitsCreated: 2, unitsUpdated: 1 });
    expect(preview.body.errors).toEqual([
      { row: 5, message: 'Unit b001 appears twice in Tower B', code: 'IMPORT_DUPLICATE_ROW', field: 'unitNumber', params: { unit: 'b001', building: 'Tower B' } },
      { row: 6, message: 'Unknown availability "free"', code: 'IMPORT_BAD_AVAILABILITY', field: 'availability', params: { value: 'free' } },
    ]);
    expect(await DevelopmentBuilding.countDocuments({ developmentId: t.devId })).toBe(1);

    const res = await post({ rows });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ dryRun: false, unitsCreated: 2, unitsUpdated: 1 });

    // Existing A1 got only the fields the file provides.
    const a1 = await DevelopmentUnit.findById(t.unit._id).lean();
    expect(a1).toMatchObject({ price: 160000, availability: 'available', unitType: 'apartment', currency: 'EUR' });
    const a201 = await DevelopmentUnit.findOne({ developmentId: t.devId, unitNumber: 'A201' }).lean();
    expect(a201).toMatchObject({ beds: 2, totalArea: 74.5, currency: 'EUR', features: ['corner'], availability: 'not_released' });
    expect(String(a201?.floorId)).toBe(String(t.floor2._id)); // existing Floor 2 reused
    const tower = await DevelopmentBuilding.findOne({ developmentId: t.devId, name: 'Tower B' }).lean();
    const ground = await DevelopmentFloor.findOne({ buildingId: tower?._id, level: 0 }).lean();
    expect(ground).toMatchObject({ label: 'Ground floor', kind: 'ground' });
    expect(await DevelopmentAuditLog.countDocuments({ developmentId: t.devId, action: 'unit.import' })).toBe(1);

    // Re-running the same file changes nothing.
    const again = await post({ rows: rows.slice(0, 3) });
    expect(again.body).toMatchObject({ unitsCreated: 0, unitsUpdated: 0, unchanged: 3, floorsCreated: 0, buildingsCreated: [] });
  });

  it('can leave existing units untouched', async () => {
    const t = await setupDevelopment();
    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/units/import`)
      .set(auth(t.ownerToken))
      .send({ rows: [rows[0]], updateExisting: false });
    expect(res.body).toMatchObject({ skippedExisting: 1, unitsUpdated: 0 });
    expect((await DevelopmentUnit.findById(t.unit._id).lean())?.price).toBe(150000);
  });

  it('applies the same permissions as editing by hand', async () => {
    const t = await setupDevelopment();
    const agent = await addMember(t.devId, 'sales_agent');
    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/units/import`)
      .set(auth(agent.token))
      .send({ rows: [rows[2]], dryRun: true });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/building.manage/);
  });

  it('rejects an empty or oversized file', async () => {
    const t = await setupDevelopment();
    const post = (body: object) => request(app).post(`${DASH}/${t.devEnc}/units/import`).set(auth(t.ownerToken)).send(body);
    expect((await post({ rows: [] })).status).toBe(400);
    // The size limit is checked by the service (the real server accepts 10 MB bodies).
    await expect(
      importUnits({ developmentId: t.devId, actorId: t.owner._id as never, role: 'owner', rows: Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => rows[0]), updateExisting: true, dryRun: true })
    ).rejects.toThrow(/At most/);
  });
});
