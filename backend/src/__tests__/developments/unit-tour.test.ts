/** A unit's 360° tour: its own link, or its linked listing's; shown to buyers and counted per building. */
import request from 'supertest';
import { createUnit } from '../../services/developments/developmentInventoryService';
import { effectiveTour, tourUrlProblem } from '../../services/developments/unitTour';
import { toListingSummary } from '../../services/developments/developmentSceneService';
import { buildApp, linkListing, makeListing, setupDevelopment } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const PUB = '/api/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const MATTERPORT = 'https://my.matterport.com/show/?m=abc123';
const KUULA = 'https://kuula.co/share/collection/7abc';

describe('tourUrlProblem / effectiveTour', () => {
  it('accepts plain http(s) tour links only', () => {
    expect(tourUrlProblem(MATTERPORT)).toBeNull();
    expect(tourUrlProblem('http://tour.example.com/x')).toBeNull();
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'matterport.com/x', 'https://user:pw@tour.example.com', 'https://localhost/x', `https://a.com/${'x'.repeat(2001)}`]) {
      expect(tourUrlProblem(bad)).not.toBeNull();
    }
  });
  it('prefers the unit’s own tour, then the primary listing’s, then any listing’s; ignores bad links', () => {
    expect(effectiveTour(MATTERPORT, [{ id: 'l1', virtualTour360Url: KUULA }])).toEqual({ url: MATTERPORT, source: 'unit' });
    expect(effectiveTour('', [{ id: 'l1', virtualTour360Url: KUULA }])).toEqual({ url: KUULA, source: 'listing' });
    expect(effectiveTour(undefined, [{ id: 'l1', virtualTour360Url: KUULA }, { id: 'l2', virtualTour360Url: MATTERPORT }], 'l2')).toEqual({ url: MATTERPORT, source: 'listing' });
    expect(effectiveTour('javascript:x', [{ id: 'l1', virtualTour360Url: 'javascript:y' }])).toBeNull();
    expect(effectiveTour(undefined, [])).toBeNull();
  });
});

describe('unit editor: the 360° tour link', () => {
  it('saves a tour link, clears it with null, and refuses anything that is not a web address', async () => {
    const t = await setupDevelopment();
    const patch = (body: Record<string, unknown>) => request(app).patch(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`).set(auth(t.ownerToken)).send(body);
    const saved = await patch({ virtualTourUrl: `  ${MATTERPORT}  ` });
    expect(saved.status).toBe(200);
    expect(saved.body.unit.virtualTourUrl).toBe(MATTERPORT);
    for (const bad of ['javascript:alert(1)', 'not a link', 'https://user:pw@evil.example.com/']) {
      const res = await patch({ virtualTourUrl: bad });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'URL_INVALID', details: { field: 'virtualTourUrl' } });
    }
    const cleared = await patch({ virtualTourUrl: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.unit.virtualTourUrl).toBeUndefined();
  });
});

describe('buyers see the tour', () => {
  it('the unit’s own tour, else its listing’s; never a draft listing’s; counted per building', async () => {
    const t = await setupDevelopment({ published: true });
    const own = await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor._id, unitNumber: 'A2', unitType: 'apartment', availability: 'available' });
    const viaListing = await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor2._id, unitNumber: 'A3', unitType: 'apartment', availability: 'available' });
    const viaDraft = await createUnit(t.devId, { buildingId: t.building._id, floorId: t.floor2._id, unitNumber: 'A4', unitType: 'apartment', availability: 'available' });
    await request(app).patch(`${DASH}/${t.devEnc}/units/${t.enc(own._id)}`).set(auth(t.ownerToken)).send({ virtualTourUrl: MATTERPORT });
    const live = await makeListing(t.owner._id, { status: 'active', virtualTour360Url: KUULA, hasVirtualTour360: true });
    const draft = await makeListing(t.owner._id, { status: 'draft', virtualTour360Url: KUULA, hasVirtualTour360: true });
    await linkListing(viaListing, live._id, true);
    await linkListing(viaDraft, draft._id, true);

    const res = await request(app).get(`${PUB}/${t.dev.slug}/units`);
    const byNumber = Object.fromEntries((res.body.units as Array<Record<string, unknown>>).map((u) => [u.unitNumber, u]));
    expect(byNumber.A2).toMatchObject({ virtualTourUrl: MATTERPORT, tourSource: 'unit' });
    expect(byNumber.A3).toMatchObject({ virtualTourUrl: KUULA, tourSource: 'listing' });
    expect(byNumber.A4.virtualTourUrl).toBeUndefined();
    expect(byNumber.A1.virtualTourUrl).toBeUndefined();

    const detail = await request(app).get(`${PUB}/${t.dev.slug}/units/${t.enc(viaListing._id)}`);
    expect(detail.body.unit).toMatchObject({ virtualTourUrl: KUULA, tourSource: 'listing' });

    const residence = await request(app).get(`${PUB}/${t.dev.slug}`);
    expect(residence.body.buildings[0].stats).toMatchObject({ units: 4, withTour: 2 });
  });

  it('the unit editor is told when the unit shows its listing’s tour', async () => {
    const t = await setupDevelopment();
    const live = await makeListing(t.owner._id, { status: 'active', virtualTour360Url: KUULA });
    await linkListing(t.unit, live._id, true);
    const res = await request(app).get(`${DASH}/${t.devEnc}/units`).set(auth(t.ownerToken));
    const unit = (res.body.items ?? res.body.units).find((u: { unitNumber: string }) => u.unitNumber === 'A1');
    expect(unit.linkedListings[0]).toMatchObject({ hasTour: true });
  });
});

describe('a picture region linked straight to a listing', () => {
  it('its hover-card summary says whether the listing has a usable 360° tour (a flag, not the link)', () => {
    expect(toListingSummary({ _id: 'x', title: 'Flat', virtualTour360Url: KUULA })).toMatchObject({ hasTour: true });
    expect(toListingSummary({ _id: 'x', title: 'Flat', virtualTour360Url: KUULA })).not.toHaveProperty('virtualTour360Url');
    expect(toListingSummary({ _id: 'x', title: 'Flat' })).not.toHaveProperty('hasTour');
    expect(toListingSummary({ _id: 'x', title: 'Flat', virtualTour360Url: 'javascript:alert(1)' })).not.toHaveProperty('hasTour');
  });
});
