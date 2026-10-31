/**
 * Deleting a building or floor created by mistake: impact preview, cascading
 * soft delete, listings detached (never deleted), dead regions removed from the
 * remaining pictures, authorization and tenant scoping.
 */
import request from 'supertest';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentScene from '../../models/DevelopmentScene';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import Property from '../../models/Property';
import { buildApp, setupDevelopment, addMember, makeListing, linkListing, encodeId } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const rect = (id: string, linkType: string, linkId: unknown) => ({
  id,
  shape: 'rect',
  points: [
    [0.1, 0.1],
    [0.3, 0.3],
  ],
  linkType,
  linkId: encodeId(String(linkId)),
  z: 0,
});

describe('delete building / floor', () => {
  it('previews, then removes a building with its floors, apartments, pictures and dead regions', async () => {
    const t = await setupDevelopment({ published: true });
    const listing = await makeListing(t.owner._id);
    await linkListing(t.unit, listing._id, true);
    await Property.updateOne({ _id: listing._id }, { $set: { developmentId: t.devId, buildingId: t.building._id, floorId: t.floor._id, unitId: t.unit._id } });
    const buildingScene = await DevelopmentScene.create({
      developmentId: t.devId, targetType: 'building', targetId: t.building._id, viewKey: 'main',
      imageUrl: 'https://cdn.example.com/b.jpg', imageWidth: 1000, imageHeight: 800,
      draft: { hotspots: [rect('u', 'unit', t.unit._id)], version: 1 },
    });
    const residence = await DevelopmentScene.create({
      developmentId: t.devId, targetType: 'development', targetId: t.devId, viewKey: 'main',
      imageUrl: 'https://cdn.example.com/a.jpg', imageWidth: 1000, imageHeight: 800,
      draft: { hotspots: [rect('b', 'building', t.building._id), rect('keep', 'listing', listing._id)], version: 3 },
      published: { hotspots: [rect('b', 'building', t.building._id)], version: 1, publishedAt: new Date() },
    });

    const url = `${DASH}/${t.devEnc}/buildings/${t.enc(t.building._id)}`;
    const impact = await request(app).get(`${url}/delete-impact`).set(auth(t.ownerToken));
    expect(impact.status).toBe(200);
    expect(impact.body.impact).toEqual({ name: 'Block A', floors: 2, units: 1, views: 1, listings: 1 });

    const del = await request(app).delete(url).set(auth(t.ownerToken));
    expect(del.status).toBe(200);
    expect((await DevelopmentBuilding.findById(t.building._id))!.deletedAt).toBeDefined();
    expect(await DevelopmentFloor.countDocuments({ buildingId: t.building._id, deletedAt: null })).toBe(0);
    expect((await DevelopmentUnit.findById(t.unit._id))!.deletedAt).toBeDefined();
    expect((await DevelopmentScene.findById(buildingScene._id))!.deletedAt).toBeDefined();

    // The listing survives, just detached from the removed places.
    const l = (await Property.findById(listing._id))!;
    expect(l).not.toBeNull();
    expect(l.buildingId).toBeUndefined();
    expect(l.unitId).toBeUndefined();

    // The residence picture loses only the region that pointed at the building.
    const res = (await DevelopmentScene.findById(residence._id))!;
    expect(res.draft.hotspots.map((h) => h.id)).toEqual(['keep']);
    expect(res.draft.version).toBe(4);
    expect(res.published!.hotspots).toHaveLength(0);

    expect(await DevelopmentAuditLog.countDocuments({ developmentId: t.devId, action: 'building.delete' })).toBe(1);
    const pub = await request(app).get(`/api/developments/${t.dev.slug}`);
    expect(pub.body.buildings).toHaveLength(0);
  });

  it('deletes just one floor and its apartments', async () => {
    const t = await setupDevelopment();
    const url = `${DASH}/${t.devEnc}/floors/${t.enc(t.floor._id)}`;
    expect((await request(app).get(`${url}/delete-impact`).set(auth(t.ownerToken))).body.impact).toMatchObject({ name: 'Floor 1', floors: 0, units: 1 });
    expect((await request(app).delete(url).set(auth(t.ownerToken))).status).toBe(200);
    expect((await DevelopmentFloor.findById(t.floor._id))!.deletedAt).toBeDefined();
    expect((await DevelopmentFloor.findById(t.floor2._id))!.deletedAt).toBeUndefined();
    expect((await DevelopmentUnit.findById(t.unit._id))!.deletedAt).toBeDefined();
    expect((await DevelopmentBuilding.findById(t.building._id))!.deletedAt).toBeUndefined();
  });

  it('needs the manage permission and stays inside the development', async () => {
    const t = await setupDevelopment();
    const other = await setupDevelopment();
    const agent = await addMember(t.devId, 'sales_agent');
    expect((await request(app).delete(`${DASH}/${t.devEnc}/buildings/${t.enc(t.building._id)}`).set(auth(agent.token))).status).toBe(403);
    expect((await request(app).delete(`${DASH}/${t.devEnc}/floors/${t.enc(t.floor._id)}`).set(auth(agent.token))).status).toBe(403);
    expect((await request(app).delete(`${DASH}/${t.devEnc}/buildings/${other.enc(other.building._id)}`).set(auth(t.ownerToken))).status).toBe(404);
    expect((await DevelopmentBuilding.findById(other.building._id))!.deletedAt).toBeUndefined();
  });
});
