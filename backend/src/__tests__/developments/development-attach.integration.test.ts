import mongoose from 'mongoose';
import Property from '../../models/Property';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import User from '../../models/User';
import { createDevelopment } from '../../services/developments/developmentService';
import {
  createBuilding,
  createFloor,
  createUnit,
} from '../../services/developments/developmentInventoryService';
import {
  attachListingToUnit,
  detachListingFromUnit,
  ConflictError,
} from '../../services/developments/developmentListingService';
import { createMockUser } from '../setup';

/**
 * Phase 3 — attach/detach integration (DB-backed; runs in CI where the mongod
 * binary is available). Proves the design's core invariants end to end:
 * the listing is preserved, the unit tracks it, multiple listings can share a
 * unit, re-homing never duplicates, and detach restores a standalone listing.
 */

const oid = () => new mongoose.Types.ObjectId();

const makeListing = async (sellerId: mongoose.Types.ObjectId, overrides: Record<string, unknown> = {}) =>
  Property.create({
    sellerId,
    createdByName: 'Owner',
    createdByEmail: 'owner@example.com',
    createdAsRole: 'private_seller',
    listingType: 'sale',
    price: 100000,
    address: '1 Main St',
    city: 'Budva',
    country: 'Montenegro',
    beds: 2,
    baths: 1,
    livingRooms: 1,
    sqft: 70,
    yearBuilt: 2018,
    description: 'Nice flat',
    imageUrl: 'https://example.com/i.jpg',
    lat: 42.28,
    lng: 18.84,
    propertyType: 'apartment',
    ...overrides,
  });

const setupDevelopmentWithUnit = async () => {
  const owner = await User.create(createMockUser());
  const dev = await createDevelopment(
    {
      name: `Dev ${Date.now()}-${Math.random().toString(36).slice(2)}`,
      country: 'Montenegro',
      city: 'Budva',
      category: 'apartment_building',
    },
    owner as any
  );
  const building = await createBuilding(dev._id as mongoose.Types.ObjectId, { name: 'Block A' });
  const floor = await createFloor(dev._id as mongoose.Types.ObjectId, building._id as mongoose.Types.ObjectId, {
    label: 'Floor 1',
    level: 1,
  });
  const unit = await createUnit(dev._id as mongoose.Types.ObjectId, {
    buildingId: building._id as mongoose.Types.ObjectId,
    floorId: floor._id as mongoose.Types.ObjectId,
    unitNumber: 'A1',
    unitType: 'apartment',
  });
  return { owner, dev, building, floor, unit };
};

describe('attach / detach listing', () => {
  it('attaches an existing listing without mutating its identity', async () => {
    const { owner, dev, unit } = await setupDevelopmentWithUnit();
    const listing = await makeListing(owner._id as mongoose.Types.ObjectId);
    const originalId = String(listing._id);

    const result = await attachListingToUnit({
      user: owner as any,
      developmentId: String(dev._id),
      unitId: String(unit._id),
      listingId: String(listing._id),
    });

    expect(result.unit.listingIds.map(String)).toContain(originalId);
    expect(String(result.unit.primaryListingId)).toBe(originalId);

    const reloaded = await Property.findById(listing._id);
    expect(String(reloaded!._id)).toBe(originalId); // same record, not duplicated
    expect(String(reloaded!.unitId)).toBe(String(unit._id));
    expect(String(reloaded!.developmentId)).toBe(String(dev._id));
    expect(await Property.countDocuments({})).toBe(1);
  });

  it('blocks attaching a listing the caller does not control', async () => {
    const { dev, unit } = await setupDevelopmentWithUnit();
    const stranger = await User.create(createMockUser());
    const listing = await makeListing(oid()); // owned by someone else

    await expect(
      attachListingToUnit({
        user: stranger as any,
        developmentId: String(dev._id),
        unitId: String(unit._id),
        listingId: String(listing._id),
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('lets two authorized listings market one physical unit', async () => {
    const { owner, dev, unit } = await setupDevelopmentWithUnit();
    const a = await makeListing(owner._id as mongoose.Types.ObjectId);
    const b = await makeListing(owner._id as mongoose.Types.ObjectId);

    await attachListingToUnit({
      user: owner as any,
      developmentId: String(dev._id),
      unitId: String(unit._id),
      listingId: String(a._id),
    });
    const res = await attachListingToUnit({
      user: owner as any,
      developmentId: String(dev._id),
      unitId: String(unit._id),
      listingId: String(b._id),
    });

    expect(res.unit.listingIds.map(String).sort()).toEqual(
      [String(a._id), String(b._id)].sort()
    );
    // First attached stays primary.
    expect(String(res.unit.primaryListingId)).toBe(String(a._id));
  });

  it('is idempotent when attaching the same listing twice', async () => {
    const { owner, dev, unit } = await setupDevelopmentWithUnit();
    const listing = await makeListing(owner._id as mongoose.Types.ObjectId);

    await attachListingToUnit({
      user: owner as any,
      developmentId: String(dev._id),
      unitId: String(unit._id),
      listingId: String(listing._id),
    });
    const res = await attachListingToUnit({
      user: owner as any,
      developmentId: String(dev._id),
      unitId: String(unit._id),
      listingId: String(listing._id),
    });
    expect(res.unit.listingIds.filter((id) => String(id) === String(listing._id))).toHaveLength(1);
  });

  it('detaches a listing, restoring a standalone listing and the unit', async () => {
    const { owner, dev, unit } = await setupDevelopmentWithUnit();
    const listing = await makeListing(owner._id as mongoose.Types.ObjectId);

    await attachListingToUnit({
      user: owner as any,
      developmentId: String(dev._id),
      unitId: String(unit._id),
      listingId: String(listing._id),
    });
    const after = await detachListingFromUnit({
      user: owner as any,
      developmentId: String(dev._id),
      unitId: String(unit._id),
      listingId: String(listing._id),
    });

    expect(after.listingIds.map(String)).not.toContain(String(listing._id));
    expect(after.primaryListingId).toBeFalsy();

    const reloaded = await Property.findById(listing._id);
    expect(reloaded).not.toBeNull(); // listing preserved
    expect(reloaded!.unitId).toBeFalsy();
    expect(reloaded!.developmentId).toBeFalsy();

    // Physical unit is never deleted by a detach.
    expect(await DevelopmentUnit.findById(unit._id)).not.toBeNull();
  });
});
