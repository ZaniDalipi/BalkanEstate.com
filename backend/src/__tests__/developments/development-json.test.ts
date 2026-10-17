/**
 * JSON id contract: every reference a development document serialises must be
 * the same encoded form as the id of the document it points at, because the
 * client compares them directly (e.g. `floors.filter(f => f.buildingId === b.id)`).
 */
import mongoose from 'mongoose';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentScene from '../../models/DevelopmentScene';
import { encodeId } from '../../utils/idObfuscation';

const oid = () => new mongoose.Types.ObjectId();
const json = (doc: { toJSON: () => unknown }) => JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;

describe('development JSON speaks encoded ids', () => {
  it('a floor references its building by the same id the building serialises', async () => {
    const developmentId = oid();
    const building = await DevelopmentBuilding.create({ developmentId, name: 'A', slug: 'a', order: 0 });
    const floor = await DevelopmentFloor.create({ developmentId, buildingId: building._id, label: 'F1', level: 1 });
    const b = json(building);
    const f = json(floor);
    expect(f.buildingId).toBe(b.id);
    expect(f.developmentId).toBe(encodeId(String(developmentId)));
    expect(f).not.toHaveProperty('_id');
    expect(f).not.toHaveProperty('__v');
  });

  it('a unit encodes every reference, including arrays of listing ids', async () => {
    const listingA = oid();
    const listingB = oid();
    const unit = await DevelopmentUnit.create({
      developmentId: oid(),
      buildingId: oid(),
      floorId: oid(),
      unitNumber: '101',
      unitType: 'apartment',
      listingIds: [listingA, listingB],
      primaryListingId: listingA,
    });
    const u = json(unit);
    expect(u.listingIds).toEqual([encodeId(String(listingA)), encodeId(String(listingB))]);
    expect(u.primaryListingId).toBe(encodeId(String(listingA)));
    expect(String(u.buildingId)).toHaveLength(16);
    expect(u).not.toHaveProperty('entranceId'); // unset refs stay unset
  });

  it('a scene still encodes its target so the editor can match it', async () => {
    const targetId = oid();
    const scene = await DevelopmentScene.create({
      developmentId: oid(),
      targetType: 'building',
      targetId,
      imageUrl: 'https://cdn.example.com/b.jpg',
      imageWidth: 10,
      imageHeight: 10,
    });
    expect(json(scene).targetId).toBe(encodeId(String(targetId)));
  });
});
