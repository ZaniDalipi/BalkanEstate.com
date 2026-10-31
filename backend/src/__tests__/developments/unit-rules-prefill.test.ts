import request from 'supertest';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { listingToUnitFields } from '../../services/developments/unitPrefillService';
import { buildApp, setupDevelopment, makeListing, makeUser, tokenFor } from './helpers/explorerHarness';

const app = buildApp();
const DASH = '/api/dashboard/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('unit rules: fixed outlook values and euros only', () => {
  it('rejects other currencies and unknown orientation/view on edit', async () => {
    const t = await setupDevelopment();
    const patch = (body: object) => request(app).patch(`${DASH}/${t.devEnc}/units/${t.enc(t.unit._id)}`).set(auth(t.ownerToken)).send(body);
    expect((await patch({ currency: 'USD' })).body.message).toMatch(/euros/);
    expect((await patch({ orientation: 'sideways' })).status).toBe(400);
    expect((await patch({ viewType: 'volcano' })).status).toBe(400);
    expect((await patch({ orientation: 'southEast', viewType: 'sea', currency: 'eur' })).status).toBe(200);
    expect(await DevelopmentUnit.findById(t.unit._id).lean()).toMatchObject({ orientation: 'southEast', viewType: 'sea', currency: 'EUR' });
  });

  it('stores new units in euros and rejects a foreign currency in an import', async () => {
    const t = await setupDevelopment();
    const created = await request(app)
      .post(`${DASH}/${t.devEnc}/units`)
      .set(auth(t.ownerToken))
      .send({ buildingId: t.enc(t.building._id), floorId: t.enc(t.floor._id), unitNumber: 'A9', unitType: 'apartment', price: 90000 });
    expect(created.status).toBeLessThan(300);
    expect((await DevelopmentUnit.findOne({ developmentId: t.devId, unitNumber: 'A9' }).lean())?.currency).toBe('EUR');

    const res = await request(app)
      .post(`${DASH}/${t.devEnc}/units/import`)
      .set(auth(t.ownerToken))
      .send({
        dryRun: true,
        rows: [
          { row: 2, building: 'Block A', level: 1, unitNumber: 'A10', fields: { currency: 'ALL', price: 1 } },
          { row: 3, building: 'Block A', level: 1, unitNumber: 'A11', fields: { orientation: 'up' } },
          { row: 4, building: 'Block A', level: 1, unitNumber: 'A12', fields: { orientation: 'south', viewType: 'city' } },
        ],
      });
    expect(res.body.errors.map((e: { row: number }) => e.row)).toEqual([2, 3]);
    expect(res.body.unitsCreated).toBe(1);
  });
});

describe('fill a unit from a listing', () => {
  it('maps the listing to unit fields', () => {
    expect(
      listingToUnitFields({
        propertyType: 'apartment', beds: 2, baths: 1, livingRooms: 1, sqft: 80, netArea: 72, price: 160000, listingType: 'sale',
        orientation: 'southEast', viewType: 'sea', furnishing: 'furnished', hasBalcony: true, parking: 1, floorNumber: 4, description: ' Bright flat ',
      } as never)
    ).toEqual({
      fields: { unitType: 'apartment', beds: 2, baths: 1, livingRooms: 1, totalArea: 80, netArea: 72, balconies: 1, price: 160000, pricePerSqm: 2000, orientation: 'southEast', viewType: 'sea', description: 'Bright flat', features: ['furnished', 'parking', 'sea_view'] },
      floorLevel: 4,
      skipped: [],
    });
    expect(listingToUnitFields({ listingType: 'rent', price: 600, sqft: 50 } as never)).toMatchObject({ fields: { totalArea: 50 }, skipped: ['rentPrice'] });
  });

  it('only reads the caller’s own listings', async () => {
    const t = await setupDevelopment();
    const mine = await makeListing(t.owner._id, { orientation: 'south', floorNumber: 3 });
    const url = (id: unknown) => `${DASH}/${t.devEnc}/listings/${t.enc(id)}/unit-prefill`;
    const ok = await request(app).get(url(mine._id)).set(auth(t.ownerToken));
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ listing: { id: t.enc(mine._id), listingType: 'sale' }, fields: { beds: 2, totalArea: 70, price: 100000, orientation: 'south' }, floorLevel: 3 });

    const other = await makeUser();
    const theirs = await makeListing(other._id);
    expect((await request(app).get(url(theirs._id)).set(auth(t.ownerToken))).status).toBe(403);
    expect((await request(app).get(url(mine._id)).set(auth(tokenFor(other._id)))).status).toBe(403);
  });
});
