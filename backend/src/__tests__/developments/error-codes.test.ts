/**
 * Every refusal the residence dashboard can show carries a stable code (and the
 * field it belongs to, and the values its text needs), so the client shows it
 * translated, next to the right field. The English message is for logs only.
 */
import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { MAX_IMPORT_ROWS } from '../../services/developments/unitImportService';
import { addMember, buildApp, makeUser, setupDevelopment, tokenFor } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const expectCode = (res: request.Response, status: number, code: string, details?: Record<string, unknown>) => {
  expect(res.status).toBe(status);
  expect(res.body.code).toBe(code);
  if (details) expect(res.body.details).toMatchObject(details);
};

describe('unit editor (PATCH unit)', () => {
  it('names the field and the problem for each kind of bad value', async () => {
    const t = await setupDevelopment();
    const patch = (body: Record<string, unknown>) =>
      request(app).patch(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`).set(auth(t.ownerToken)).send(body);
    expectCode(await patch({ unitNumber: '  ' }), 400, 'FIELD_REQUIRED', { field: 'unitNumber' });
    expectCode(await patch({ unitNumber: 'x'.repeat(51) }), 400, 'FIELD_TOO_LONG', { field: 'unitNumber', params: { max: 50 } });
    expectCode(await patch({ beds: -1 }), 400, 'FIELD_NOT_NUMBER', { field: 'beds' });
    expectCode(await patch({ beds: 'two' }), 400, 'FIELD_NOT_NUMBER', { field: 'beds' });
    expectCode(await patch({ description: 'x'.repeat(4001) }), 400, 'FIELD_TOO_LONG', { field: 'description', params: { max: 4000 } });
    expectCode(await patch({ orientation: 'up' }), 400, 'FIELD_INVALID', { field: 'orientation' });
    expectCode(await patch({ currency: 'USD' }), 400, 'CURRENCY_EUR_ONLY', { field: 'currency' });
    expectCode(await patch({ features: ['jacuzzi-on-mars'] }), 400, 'FIELD_INVALID', { field: 'features' });
    expectCode(await patch({ availability: 'gone' }), 400, 'FIELD_INVALID', { field: 'availability' });
    expectCode(await patch({ visibility: 'secret' }), 400, 'FIELD_INVALID', { field: 'visibility' });
    expectCode(await patch({ priceVisibility: 'maybe' }), 400, 'FIELD_INVALID', { field: 'priceVisibility' });
    expectCode(await patch({ floorId: null }), 400, 'FIELD_REQUIRED', { field: 'floorId' });
    expectCode(await patch({ floorId: 'nonsense' }), 400, 'FIELD_INVALID', { field: 'floorId' });
    expectCode(await patch({ nothing: 1 }), 400, 'NO_CHANGES');
  });

  it('a unit number already used in the building, a floor of another building, a unit that is gone', async () => {
    const t = await setupDevelopment();
    await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'B7', unitType: 'apartment' } as never);
    const patch = (body: Record<string, unknown>, unitId = t.unit._id) =>
      request(app).patch(`${DASH}/${t.devEnc}/units/${t.enc(unitId)}`).set(auth(t.ownerToken)).send(body);
    expectCode(await patch({ unitNumber: 'B7' }), 409, 'UNIT_NUMBER_TAKEN', { field: 'unitNumber', params: { number: 'B7' } });

    const other = await request(app).post(`${DASH}/${t.devEnc}/buildings`).set(auth(t.ownerToken)).send({ name: 'Block B' });
    const otherFloor = await request(app).post(`${DASH}/${t.devEnc}/floors`).set(auth(t.ownerToken)).send({ buildingId: other.body.building.id, label: 'B1', level: 1 });
    expectCode(await patch({ floorId: otherFloor.body.floor.id }), 400, 'FLOOR_NOT_IN_BUILDING', { field: 'floorId' });

    await DevelopmentUnit.updateOne({ _id: t.unit._id }, { $set: { deletedAt: new Date() } });
    expectCode(await patch({ beds: 2 }), 404, 'REF_NOT_FOUND', { field: 'unitId' });
  });

  it('a role without price rights is refused with a code', async () => {
    const t = await setupDevelopment();
    const sales = await addMember(t.devId, 'sales_agent');
    const res = await request(app).patch(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`).set(auth(sales.token)).send({ price: 1 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_FIELDS');
  });
});

describe('creating units, floors and buildings', () => {
  it('names the missing or clashing field', async () => {
    const t = await setupDevelopment();
    const post = (path: string, body: Record<string, unknown>) => request(app).post(`${DASH}/${t.devEnc}/${path}`).set(auth(t.ownerToken)).send(body);
    const unitBase = { buildingId: t.enc(t.building._id), floorId: t.enc(t.floor._id), unitType: 'apartment' };
    expectCode(await post('units', { ...unitBase, unitNumber: '' }), 400, 'FIELD_REQUIRED', { field: 'unitNumber' });
    expectCode(await post('units', { ...unitBase, unitNumber: 'A1' }), 400, 'UNIT_NUMBER_TAKEN', { field: 'unitNumber', params: { number: 'A1' } });
    expectCode(await post('units', { ...unitBase, unitNumber: 'Z9', availability: 'gone' }), 400, 'FIELD_INVALID', { field: 'availability' });
    expectCode(await post('floors', { label: 'X', level: 3 }), 400, 'FIELD_REQUIRED', { field: 'buildingId' });
    expectCode(await post('floors', { buildingId: t.enc(t.building._id), label: '', level: 3 }), 400, 'FIELD_REQUIRED', { field: 'label' });
    expectCode(await post('floors', { buildingId: t.enc(t.building._id), label: 'F', level: 'top' }), 400, 'FIELD_NOT_NUMBER', { field: 'level' });
    expectCode(await post('buildings', { name: ' ' }), 400, 'FIELD_REQUIRED', { field: 'name' });
  });

  it('renaming a building or floor: required and too long', async () => {
    const t = await setupDevelopment();
    const patch = (path: string, body: Record<string, unknown>) => request(app).patch(`${DASH}/${t.devEnc}/${path}`).set(auth(t.ownerToken)).send(body);
    expectCode(await patch(`buildings/${t.enc(t.building._id)}`, { name: '' }), 400, 'FIELD_REQUIRED', { field: 'name' });
    expectCode(await patch(`buildings/${t.enc(t.building._id)}`, { name: 'x'.repeat(201) }), 400, 'FIELD_TOO_LONG', { field: 'name', params: { max: 200 } });
    expectCode(await patch(`floors/${t.enc(t.floor._id)}`, { label: 'x'.repeat(61) }), 400, 'FIELD_TOO_LONG', { field: 'label', params: { max: 60 } });
  });
});

describe('bulk updates', () => {
  it('empty, too many, and nothing to change', async () => {
    const t = await setupDevelopment();
    const bulk = (body: Record<string, unknown>) => request(app).post(`${DASH}/${t.devEnc}/units/bulk`).set(auth(t.ownerToken)).send(body);
    expectCode(await bulk({ unitIds: [], availability: 'sold' }), 400, 'BULK_EMPTY');
    expectCode(await bulk({ unitIds: Array.from({ length: 501 }, () => t.enc(t.unit._id)), availability: 'sold' }), 400, 'BULK_TOO_MANY');
    expectCode(await bulk({ unitIds: [t.enc(t.unit._id)] }), 400, 'NO_CHANGES');
    expectCode(await bulk({ unitIds: ['bad'], availability: 'sold' }), 400, 'FIELD_INVALID', { field: 'unitIds' });
  });
});

describe('uploads', () => {
  it('a file that is not a picture, and none at all', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}/floorplan`;
    const notImage = await request(app).post(url).set(auth(t.ownerToken)).attach('floorplan', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    expectCode(notImage, 400, 'IMAGE_TYPE');
    const none = await request(app).post(url).set(auth(t.ownerToken));
    expectCode(none, 400, 'NO_IMAGES');
  });
});

describe('residence create and details', () => {
  it('names the field for each bad value on create', async () => {
    const user = await makeUser();
    const create = (body: Record<string, unknown>) =>
      request(app).post(DASH).set(auth(tokenFor(user._id))).send({ name: 'Aurora', category: 'apartment_building', country: 'Albania', city: 'Tirana', ...body });
    expectCode(await create({ name: '' }), 400, 'FIELD_REQUIRED', { field: 'name' });
    expectCode(await create({ city: ' ' }), 400, 'FIELD_REQUIRED', { field: 'city' });
    expectCode(await create({ category: 'castle' }), 400, 'FIELD_INVALID', { field: 'category' });
    expectCode(await create({ website: 'javascript:alert(1)' }), 400, 'URL_INVALID', { field: 'website' });
  });

  it('names the field for each bad value when editing details', async () => {
    const t = await setupDevelopment();
    const patch = (body: Record<string, unknown>) => request(app).patch(`${DASH}/${t.devEnc}`).set(auth(t.ownerToken)).send(body);
    expectCode(await patch({ name: '' }), 400, 'FIELD_REQUIRED', { field: 'name' });
    expectCode(await patch({ lat: 91 }), 400, 'FIELD_RANGE', { field: 'lat', params: { min: -90, max: 90 } });
    expectCode(await patch({ yearBuilt: 1700, constructionStatus: 'completed' }), 400, 'FIELD_RANGE', { field: 'yearBuilt', params: { min: 1800 } });
    expectCode(await patch({ contact: { email: 'not-an-email' } }), 400, 'EMAIL_INVALID', { field: 'contact.email' });
    expectCode(await patch({ amenities: ['x'.repeat(61)] }), 400, 'FIELD_TOO_LONG', { field: 'amenities', params: { max: 60 } });
    expectCode(await patch({ amenities: Array.from({ length: 41 }, (_, i) => `a${i}`) }), 400, 'TOO_MANY_ITEMS', { field: 'amenities', params: { max: 40 } });
  });
});

describe('who may act', () => {
  it('outsiders, roles without the right, and signed-out requests are told why', async () => {
    const t = await setupDevelopment();
    const outsider = await makeUser();
    expectCode(await request(app).get(`${DASH}/${t.devEnc}`).set(auth(tokenFor(outsider._id))), 403, 'NOT_TEAM_MEMBER');
    const viewer = await addMember(t.devId, 'viewer');
    expectCode(await request(app).patch(`${DASH}/${t.devEnc}`).set(auth(viewer.token)).send({ name: 'X' }), 403, 'FORBIDDEN', { params: { permission: 'project.edit' } });
  });
});

describe('import', () => {
  it('an empty file and a file that is too long', async () => {
    const t = await setupDevelopment();
    const post = (rows: unknown) => request(app).post(`${DASH}/${t.devEnc}/units/import`).set(auth(t.ownerToken)).send({ rows, dryRun: true });
    expectCode(await post([]), 400, 'IMPORT_EMPTY');
    expectCode(await post(Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => ({}))), 400, 'IMPORT_TOO_MANY', { params: { max: MAX_IMPORT_ROWS } });
  });
});
