/** Placing unit gallery photos on the unit's floor plan (PATCH …/gallery/spots) and the pure parser behind it. */
import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { parseUnitPhotoSpots } from '../../services/developments/unitPhotoSpots';
import { buildApp, setupDevelopment, addMember } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const A = 'https://cdn.example.com/a.jpg';
const B = 'https://cdn.example.com/b.jpg';

describe('parseUnitPhotoSpots', () => {
  it('accepts spots and nulls for photos of the gallery, folding 360° to 0', () => {
    expect(parseUnitPhotoSpots([{ url: A, spot: { x: 10, y: 90, angle: 360 } }, { url: B, spot: null }], [A, B])).toEqual({
      ok: true,
      value: [
        { url: A, spot: { x: 10, y: 90, angle: 0 } },
        { url: B, spot: null },
      ],
    });
  });

  it.each([
    ['not an array', {}],
    ['an unknown photo', [{ url: 'https://evil.example/x.jpg', spot: null }]],
    ['a photo twice', [{ url: A, spot: null }, { url: A, spot: null }]],
    ['x off the plan', [{ url: A, spot: { x: 101, y: 5, angle: 0 } }]],
    ['a missing angle', [{ url: A, spot: { x: 1, y: 5 } }]],
    ['a string coordinate', [{ url: A, spot: { x: '5', y: 5, angle: 0 } }]],
  ])('rejects %s', (_label, body) => {
    expect(parseUnitPhotoSpots(body, [A, B]).ok).toBe(false);
  });
});

describe('PATCH /units/:unitId/gallery/spots', () => {
  const seed = async (withPlan = true) => {
    const t = await setupDevelopment();
    await DevelopmentUnit.updateOne(
      { _id: t.unit._id },
      { $set: { gallery: [{ url: A }, { url: B }], ...(withPlan ? { floorplan: { url: 'https://cdn.example.com/plan.jpg' } } : {}) } }
    );
    return { t, url: `${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}/gallery/spots` };
  };

  it('stores spots by photo URL, clears one with null', async () => {
    const { t, url } = await seed();
    const put = await request(app)
      .patch(url)
      .set(auth(t.ownerToken))
      .send({ spots: [{ url: A, spot: { x: 20, y: 30, angle: 90 } }, { url: B, spot: { x: 50, y: 50, angle: 0 } }] });
    expect(put.status).toBe(200);
    expect(put.body.unit.gallery[0].floorplanSpot).toEqual({ x: 20, y: 30, angle: 90 });

    const clear = await request(app).patch(url).set(auth(t.ownerToken)).send({ spots: [{ url: B, spot: null }] });
    expect(clear.status).toBe(200);
    const stored = (await DevelopmentUnit.findById(t.unit._id))!.gallery;
    expect(stored[0].floorplanSpot).toMatchObject({ x: 20, y: 30, angle: 90 });
    expect(stored[1].floorplanSpot).toBeUndefined();
  });

  it('needs a floor plan first', async () => {
    const { t, url } = await seed(false);
    const res = await request(app).patch(url).set(auth(t.ownerToken)).send({ spots: [{ url: A, spot: { x: 1, y: 1, angle: 0 } }] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FLOORPLAN_REQUIRED');
  });

  it('rejects a photo that is not in the gallery', async () => {
    const { t, url } = await seed();
    const res = await request(app).patch(url).set(auth(t.ownerToken)).send({ spots: [{ url: 'https://x.example/z.jpg', spot: null }] });
    expect(res.status).toBe(400);
  });

  it('needs media.upload', async () => {
    const { t, url } = await seed();
    const agent = await addMember(t.devId, 'sales_agent');
    const res = await request(app).patch(url).set(auth(agent.token)).send({ spots: [{ url: A, spot: null }] });
    expect(res.status).toBe(403);
  });
});
