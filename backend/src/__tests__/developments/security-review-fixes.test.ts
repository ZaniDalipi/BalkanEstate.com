/**
 * Regression tests for the residence-explorer security review: each block pins
 * one confirmed finding (leak, missing authz, unbounded work) so it can't return.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import Development from '../../models/Development';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { createDevelopment, recomputeDevelopmentStats } from '../../services/developments/developmentService';
import { unitMatchesFilters } from '../../services/developments/developmentAlertService';
import { csvCell } from '../../services/developments/unitAdminService';
import { replaceVariables } from '../../utils/emailTemplateRenderer';
import { MAX_POINTS_PER_SCENE } from '../../config/developments';
import { validateHotspots } from '../../services/developments/developmentSceneService';
import { buildApp, setupDevelopment, addMember, makeUser, tokenFor } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const PUB = '/api/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('public payloads', () => {
  it('/nearby returns the public projection (no owner id or storage key)', async () => {
    const t = await setupDevelopment({ published: true });
    await Development.updateOne({ _id: t.devId }, { $set: { lat: 42.28, lng: 18.84, coverImagePublicId: 'secret/cover' } });
    const viewer = await makeUser();
    const res = await request(app).get(`${PUB}/nearby?lat=42.28&lng=18.84`).set(auth(tokenFor(viewer._id)));
    expect(res.status).toBe(200);
    const dev = res.body.suggestions.find((s: { development: { slug: string } }) => s.development.slug === t.dev.slug);
    expect(dev).toBeDefined();
    expect(dev.development.ownerId).toBeUndefined();
    expect(dev.development.coverImagePublicId).toBeUndefined();
  });

  it('development stats never count hidden units', async () => {
    const t = await setupDevelopment({ published: true });
    await DevelopmentUnit.create({
      developmentId: t.devId,
      buildingId: t.building._id,
      floorId: t.floor._id,
      unitNumber: 'H1',
      unitType: 'apartment',
      availability: 'available',
      visibility: 'hidden',
    });
    const stats = await recomputeDevelopmentStats(t.devId);
    expect(stats.units).toBe(1);
    expect(stats.available).toBe(1);
  });

  it('follower price bands never match an on-request price', () => {
    const filters = { minPrice: 100000, maxPrice: 200000 };
    expect(unitMatchesFilters({ price: 150000 }, filters)).toBe(true);
    expect(unitMatchesFilters({ price: 150000, priceVisibility: 'on_request' }, filters)).toBe(false);
  });

  it('request-attachment does not reveal draft developments', async () => {
    const t = await setupDevelopment();
    const other = await makeUser();
    const res = await request(app).post(`${PUB}/${t.dev.slug}/request-attachment`).set(auth(tokenFor(other._id))).send({});
    expect(res.status).toBe(404);
  });

  it('negative limit/skip on the public list are clamped', async () => {
    await setupDevelopment({ published: true });
    await setupDevelopment({ published: true });
    const neg = await request(app).get(`${PUB}?limit=-1000000`);
    expect(neg.status).toBe(200);
    expect(neg.body.developments.length).toBeLessThanOrEqual(20);
    const skip = await request(app).get(`${PUB}?skip=-1`);
    expect(skip.status).toBe(200);
  });
});

describe('dashboard authorization', () => {
  it('unit create applies the same price/availability rules as PATCH', async () => {
    const t = await setupDevelopment();
    const editor = await addMember(t.devId, 'editor');
    const base = { buildingId: t.enc(t.building._id), floorId: t.enc(t.floor._id), unitType: 'apartment' };

    const priced = await request(app).post(`${DASH}/${t.devEnc}/units`).set(auth(editor.token)).send({ ...base, unitNumber: 'E1', price: 1 });
    expect(priced.status).toBe(403);
    const sold = await request(app).post(`${DASH}/${t.devEnc}/units`).set(auth(editor.token)).send({ ...base, unitNumber: 'E2', availability: 'sold' });
    expect(sold.status).toBe(403);
    const plain = await request(app).post(`${DASH}/${t.devEnc}/units`).set(auth(editor.token)).send({ ...base, unitNumber: 'E3' });
    expect(plain.status).toBe(201);
  });

  it('a development can only be created under an agency the caller administers', async () => {
    const user = await makeUser();
    const foreignAgency = new mongoose.Types.ObjectId().toHexString();
    await expect(
      createDevelopment(
        { name: 'Hijack', country: 'Montenegro', city: 'Budva', category: 'apartment_building', agencyId: foreignAgency },
        user as never
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('website must be an http(s) URL', async () => {
    const user = await makeUser();
    await expect(
      createDevelopment(
        { name: 'Bad link', country: 'Montenegro', city: 'Budva', category: 'apartment_building', website: 'javascript:alert(1)' },
        user as never
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('bounded work and output encoding', () => {
  it('rejects a draft whose total vertex count exceeds the per-view cap', async () => {
    // Called on the service directly: the payload is larger than the test
    // app's default body limit (the real app accepts up to 10 MB).
    const perPolygon = 200;
    const count = Math.ceil(MAX_POINTS_PER_SCENE / perPolygon) + 1;
    const ring = Array.from({ length: perPolygon }, (_, i) => {
      const a = (i / perPolygon) * Math.PI * 2;
      return [0.5 + 0.4 * Math.cos(a), 0.5 + 0.4 * Math.sin(a)];
    });
    const hotspots = Array.from({ length: count }, (_, i) => ({ id: `h${i}`, shape: 'polygon', points: ring, linkType: 'unit', linkId: 'x', z: i }));
    const started = Date.now();
    await expect(
      validateHotspots(hotspots, { developmentId: new mongoose.Types.ObjectId(), mode: 'draft' } as never)
    ).rejects.toMatchObject({ statusCode: 400, errors: [expect.objectContaining({ field: 'points', code: 'too_many_hotspots' })] });
    // Rejected before any per-polygon geometry work.
    expect(Date.now() - started).toBeLessThan(500);
  });

  it('CSV cells are always quoted and neutralise formulas after list separators', () => {
    expect(csvCell('A1')).toBe('"A1"');
    expect(csvCell("A;=cmd|' /C calc'!A0")).toBe(`"'A;=cmd|' /C calc'!A0"`);
    expect(csvCell('  =1+1')).toBe(`"'  =1+1"`);
    expect(csvCell(42)).toBe('42');
  });

  it('email template values are inserted literally', () => {
    const out = replaceVariables('<p>{{message}}</p>{{#if x}}hidden{{/if}}', { message: "cost $` and $' and {{#if y}}kept{{/if}}" });
    expect(out).toBe("<p>cost $` and $' and {{#if y}}kept{{/if}}</p>");
  });
});
