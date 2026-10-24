import request from 'supertest';
import Development from '../../models/Development';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import Property from '../../models/Property';
import { buildApp, setupDevelopment, makeListing, linkListing, makeUser, tokenFor } from './helpers/explorerHarness';

const app = buildApp();
const PUB = '/api/developments';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('nearby residences remember where a listing is attached', () => {
  it('reports the apartment for the listing owner, the residence alone, or nothing', async () => {
    const t = await setupDevelopment({ published: true });
    await Development.updateOne({ _id: t.devId }, { $set: { lat: 42.28, lng: 18.84 } });
    const listing = await makeListing(t.owner._id);
    const url = (id: unknown) => `${PUB}/nearby?lat=42.28&lng=18.84&listingId=${t.enc(id)}`;
    const find = (body: { suggestions: { development: { slug: string }; attachment: unknown }[] }) =>
      body.suggestions.find((s) => s.development.slug === t.dev.slug);

    let res = await request(app).get(url(listing._id)).set(auth(t.ownerToken));
    expect(find(res.body)?.attachment).toBeNull();

    await Property.updateOne({ _id: listing._id }, { $set: { developmentId: t.devId } });
    res = await request(app).get(url(listing._id)).set(auth(t.ownerToken));
    expect(find(res.body)?.attachment).toEqual({});

    await linkListing(t.unit, listing._id, true);
    await Property.updateOne({ _id: listing._id }, { $set: { unitId: t.unit._id, buildingId: t.building._id, floorId: t.floor._id } });
    res = await request(app).get(url(listing._id)).set(auth(t.ownerToken));
    expect(find(res.body)?.attachment).toEqual({ unitId: t.enc(t.unit._id), unitNumber: 'A1', buildingName: 'Block A' });

    // Someone else's listing reveals nothing.
    const stranger = await makeUser();
    res = await request(app).get(url(listing._id)).set(auth(tokenFor(stranger._id)));
    expect(find(res.body)?.attachment).toBeNull();
  });
});

describe('listing detail: part of a residence', () => {
  it('names the published residence and its visible apartment; nothing for drafts or hidden units', async () => {
    const t = await setupDevelopment({ published: true });
    const listing = await makeListing(t.owner._id, { developmentId: t.devId, unitId: t.unit._id });
    const get = async () => (await request(app).get(`${PUB}/for-listing/${t.enc(listing._id)}`)).body.residence;

    expect(await get()).toEqual({
      name: t.dev.name,
      slug: t.dev.slug,
      city: 'Budva',
      unit: { id: t.enc(t.unit._id), unitNumber: 'A1', buildingName: 'Block A', floorLabel: 'Floor 1' },
    });

    await DevelopmentUnit.updateOne({ _id: t.unit._id }, { $set: { visibility: 'hidden' } });
    expect((await get()).unit).toBeUndefined();

    await Property.updateOne({ _id: listing._id }, { $set: { status: 'draft' } });
    expect(await get()).toBeNull();

    await Property.updateOne({ _id: listing._id }, { $set: { status: 'active' } });
    await Development.updateOne({ _id: t.devId }, { $set: { status: 'draft' } });
    expect(await get()).toBeNull();
  });
});
