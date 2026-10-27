/**
 * Index regression tests for the development models.
 *
 * MongoDB rejects `$exists: false` inside a partial index filter. Mongoose only
 * logs autoIndex failures, so such an index silently never exists in production
 * and the uniqueness rule it was meant to enforce disappears. These tests build
 * every index for real and prove the soft-delete-aware uniqueness rules hold.
 */
import mongoose from 'mongoose';
import Development from '../../models/Development';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentScene from '../../models/DevelopmentScene';

const oid = () => new mongoose.Types.ObjectId();

const UNIQUE_INDEXES: Array<[mongoose.Model<any>, string]> = [
  [Development, 'development_slug_unique'],
  [DevelopmentBuilding, 'building_slug_per_development_unique'],
  [DevelopmentUnit, 'unit_number_per_entrance_unique'],
  [DevelopmentUnit, 'unit_number_per_building_unique'],
  [DevelopmentScene, 'scene_per_target_view_unique'],
];

describe('development model indexes', () => {
  it('builds every declared index without error', async () => {
    for (const model of [Development, DevelopmentBuilding, DevelopmentUnit, DevelopmentScene]) {
      await expect(model.syncIndexes()).resolves.toBeDefined();
    }
  });

  it.each(UNIQUE_INDEXES)('%p has its unique index %s', async (model, name) => {
    await model.syncIndexes();
    const indexes = await model.collection.indexes();
    const found = indexes.find((ix) => ix.name === name);
    expect(found).toBeDefined();
    expect(found?.unique).toBe(true);
  });

  it('enforces building-scoped unit numbers even when entranceId is explicitly null', async () => {
    await DevelopmentUnit.syncIndexes();
    const base = { developmentId: oid(), buildingId: oid(), floorId: oid(), unitType: 'apartment' };
    await DevelopmentUnit.create({ ...base, unitNumber: '1', entranceId: null });
    await expect(DevelopmentUnit.create({ ...base, unitNumber: '1' })).rejects.toThrow(/duplicate key/i);
  });

  it('does not collide unit numbers across different buildings when entranceId is null', async () => {
    await DevelopmentUnit.syncIndexes();
    const common = { developmentId: oid(), floorId: oid(), unitType: 'apartment', unitNumber: '1', entranceId: null };
    await DevelopmentUnit.create({ ...common, buildingId: oid() });
    await expect(DevelopmentUnit.create({ ...common, buildingId: oid() })).resolves.toBeDefined();
  });

  it('frees a building slug once the building is soft-deleted', async () => {
    await DevelopmentBuilding.syncIndexes();
    const developmentId = oid();
    const first = await DevelopmentBuilding.create({ developmentId, name: 'A', slug: 'block-a', order: 0 });
    await expect(
      DevelopmentBuilding.create({ developmentId, name: 'A2', slug: 'block-a', order: 1 })
    ).rejects.toThrow(/duplicate key/i);
    first.set('deletedAt', new Date());
    await first.save();
    await expect(
      DevelopmentBuilding.create({ developmentId, name: 'A3', slug: 'block-a', order: 2 })
    ).resolves.toBeDefined();
  });

  it('allows several views of one building but never two with the same key', async () => {
    await DevelopmentScene.syncIndexes();
    const base = {
      developmentId: oid(),
      targetType: 'building',
      targetId: oid(),
      imageUrl: 'https://cdn.example.com/b.jpg',
      imageWidth: 1600,
      imageHeight: 900,
    };
    await DevelopmentScene.create({ ...base, viewKey: 'front', viewDirection: 'front' });
    await expect(DevelopmentScene.create({ ...base, viewKey: 'back', viewDirection: 'back' })).resolves.toBeDefined();
    await expect(DevelopmentScene.create({ ...base, viewKey: 'front' })).rejects.toThrow(/duplicate key/i);
  });

  it('defaults a scene to the main view', async () => {
    const scene = await DevelopmentScene.create({
      developmentId: oid(),
      targetType: 'floor',
      targetId: oid(),
      imageUrl: 'https://cdn.example.com/f.jpg',
      imageWidth: 800,
      imageHeight: 600,
    });
    expect(scene.viewKey).toBe('main');
    expect(scene.viewDirection).toBe('front');
    expect(scene.sortOrder).toBe(0);
  });

  it('rejects a view key that is not a short lowercase slug', async () => {
    await expect(
      DevelopmentScene.create({
        developmentId: oid(),
        targetType: 'building',
        targetId: oid(),
        viewKey: 'Front View!',
        imageUrl: 'https://cdn.example.com/x.jpg',
        imageWidth: 10,
        imageHeight: 10,
      })
    ).rejects.toThrow(/viewKey/);
  });
});
