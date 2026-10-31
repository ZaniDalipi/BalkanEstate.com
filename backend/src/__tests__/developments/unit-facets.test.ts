import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { buildApp, setupDevelopment, addMember } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('unit facets', () => {
  it('counts live units per building, floor, availability and visibility', async () => {
    const t = await setupDevelopment();
    const base = { developmentId: t.devId, buildingId: t.building._id, unitType: 'apartment' };
    await DevelopmentUnit.create([
      { ...base, floorId: t.floor2._id, unitNumber: 'A2', availability: 'sold', visibility: 'hidden' },
      { ...base, floorId: t.floor2._id, unitNumber: 'A3', availability: 'available' },
      { ...base, floorId: t.floor2._id, unitNumber: 'A4', availability: 'available', deletedAt: new Date() },
    ]);
    const member = await addMember(t.devId, 'sales_agent');
    const res = await request(app).get(`${DASH}/${t.devEnc}/units/facets`).set(auth(member.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 3,
      byBuilding: { [t.enc(t.building._id)]: 3 },
      byFloor: { [t.enc(t.floor._id)]: 1, [t.enc(t.floor2._id)]: 2 },
      byAvailability: { available: 2, sold: 1 },
      byVisibility: { public: 2, hidden: 1 },
    });
  });

  it('is only for team members', async () => {
    const t = await setupDevelopment();
    const outsider = await addMember(t.devId, 'sales_agent');
    const other = await setupDevelopment();
    expect((await request(app).get(`${DASH}/${other.devEnc}/units/facets`).set(auth(outsider.token))).status).toBe(403);
  });
});
