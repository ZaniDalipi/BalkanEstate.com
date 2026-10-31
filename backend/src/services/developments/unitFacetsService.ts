/**
 * Live counts behind the dashboard's dropdowns ("Plaza Tower · 84 units",
 * "Floor 20 · 4 units", "Available (44)"): one aggregation over the
 * development's live units, grouped four ways.
 */
import mongoose from 'mongoose';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { encodeId } from '../../utils/idObfuscation';

export interface UnitFacets {
  total: number;
  byBuilding: Record<string, number>;
  byFloor: Record<string, number>;
  byAvailability: Record<string, number>;
  byVisibility: Record<string, number>;
}

type Bucket = { _id: unknown; n: number };

const toMap = (rows: Bucket[], encode: boolean): Record<string, number> =>
  Object.fromEntries(rows.filter((r) => r._id !== null && r._id !== undefined).map((r) => [encode ? encodeId(String(r._id)) : String(r._id), r.n]));

export const getUnitFacets = async (developmentId: mongoose.Types.ObjectId): Promise<UnitFacets> => {
  const [result] = await DevelopmentUnit.aggregate<{ total: { n: number }[]; building: Bucket[]; floor: Bucket[]; availability: Bucket[]; visibility: Bucket[] }>([
    { $match: { developmentId, deletedAt: null } },
    {
      $facet: {
        total: [{ $count: 'n' }],
        building: [{ $group: { _id: '$buildingId', n: { $sum: 1 } } }],
        floor: [{ $group: { _id: '$floorId', n: { $sum: 1 } } }],
        availability: [{ $group: { _id: '$availability', n: { $sum: 1 } } }],
        // Units written before visibility existed are public.
        visibility: [{ $group: { _id: { $ifNull: ['$visibility', 'public'] }, n: { $sum: 1 } } }],
      },
    },
  ]);
  return {
    total: result?.total[0]?.n ?? 0,
    byBuilding: toMap(result?.building ?? [], true),
    byFloor: toMap(result?.floor ?? [], true),
    byAvailability: toMap(result?.availability ?? [], false),
    byVisibility: toMap(result?.visibility ?? [], false),
  };
};
