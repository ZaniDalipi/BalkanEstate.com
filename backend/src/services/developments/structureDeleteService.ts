/**
 * Deleting a building or a floor created by mistake.
 *
 * A delete is a soft delete that cascades down the hierarchy so nothing is
 * left dangling: a building takes its floors, entrances, apartments and every
 * picture (view) of the building or its floors with it; a floor takes its
 * apartments and its pictures. Listings attached to the removed apartments are
 * NOT deleted — they are only detached and stay live on the marketplace.
 *
 * `previewStructureDelete` reports exactly what would go, so the dashboard can
 * ask "Delete Building A? 3 floors, 12 apartments and 2 pictures go with it."
 */
import mongoose from 'mongoose';
import Property from '../../models/Property';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import DevelopmentEntrance from '../../models/DevelopmentEntrance';
import DevelopmentScene from '../../models/DevelopmentScene';
import { withOptionalTransaction } from '../../utils/withOptionalTransaction';
import { encodeId } from '../../utils/idObfuscation';
import { recomputeDevelopmentStats } from './developmentService';
import { requireRefInDevelopment } from './developmentRefs';
import { recordDevelopmentAudit } from './developmentAudit';

type Oid = mongoose.Types.ObjectId;

export type StructureKind = 'building' | 'floor';

export interface StructureDeleteImpact {
  name: string;
  floors: number;
  units: number;
  views: number;
  /** Listings attached to the removed apartments; they are detached, never deleted. */
  listings: number;
}

const LIVE = { deletedAt: null } as const;

interface Scope {
  name: string;
  buildingId?: Oid;
  floorIds: Oid[];
  entranceIds: Oid[];
  unitIds: Oid[];
  sceneIds: Oid[];
  listings: number;
}

const resolveScope = async (developmentId: Oid, kind: StructureKind, rawId: unknown): Promise<Scope> => {
  if (kind === 'building') {
    const building = await requireRefInDevelopment(DevelopmentBuilding, rawId, developmentId, 'buildingId');
    const buildingId = building._id as Oid;
    const [floors, entrances, units] = await Promise.all([
      DevelopmentFloor.find({ developmentId, buildingId, ...LIVE }).select('_id').lean(),
      DevelopmentEntrance.find({ developmentId, buildingId, ...LIVE }).select('_id').lean(),
      DevelopmentUnit.find({ developmentId, buildingId, ...LIVE }).select('_id listingIds').lean(),
    ]);
    const floorIds = floors.map((f) => f._id as Oid);
    const scenes = await DevelopmentScene.find({
      developmentId,
      ...LIVE,
      $or: [
        { targetType: 'building', targetId: buildingId },
        { targetType: 'floor', targetId: { $in: floorIds } },
      ],
    })
      .select('_id')
      .lean();
    return {
      name: building.name,
      buildingId,
      floorIds,
      entranceIds: entrances.map((e) => e._id as Oid),
      unitIds: units.map((u) => u._id as Oid),
      sceneIds: scenes.map((s) => s._id as Oid),
      listings: units.reduce((n, u) => n + (u.listingIds?.length ?? 0), 0),
    };
  }
  const floor = await requireRefInDevelopment(DevelopmentFloor, rawId, developmentId, 'floorId');
  const floorId = floor._id as Oid;
  const [units, scenes] = await Promise.all([
    DevelopmentUnit.find({ developmentId, floorId, ...LIVE }).select('_id listingIds').lean(),
    DevelopmentScene.find({ developmentId, targetType: 'floor', targetId: floorId, ...LIVE }).select('_id').lean(),
  ]);
  return {
    name: floor.label,
    floorIds: [floorId],
    entranceIds: [],
    unitIds: units.map((u) => u._id as Oid),
    sceneIds: scenes.map((s) => s._id as Oid),
    listings: units.reduce((n, u) => n + (u.listingIds?.length ?? 0), 0),
  };
};

const toImpact = (s: Scope, kind: StructureKind): StructureDeleteImpact => ({
  name: s.name,
  floors: kind === 'building' ? s.floorIds.length : 0,
  units: s.unitIds.length,
  views: s.sceneIds.length,
  listings: s.listings,
});

export const previewStructureDelete = async (
  developmentId: Oid,
  kind: StructureKind,
  rawId: unknown
): Promise<StructureDeleteImpact> => toImpact(await resolveScope(developmentId, kind, rawId), kind);

export const deleteStructure = async (params: {
  developmentId: Oid;
  actorId: Oid;
  kind: StructureKind;
  id: unknown;
}): Promise<StructureDeleteImpact> => {
  const { developmentId, actorId, kind } = params;
  const scope = await resolveScope(developmentId, kind, params.id);
  const now = new Date();

  await withOptionalTransaction(async (session) => {
    const opts = { session };
    if (scope.buildingId) {
      await DevelopmentBuilding.updateOne({ _id: scope.buildingId, developmentId }, { $set: { deletedAt: now } }, opts);
      await DevelopmentEntrance.updateMany({ _id: { $in: scope.entranceIds }, developmentId }, { $set: { deletedAt: now } }, opts);
    }
    await DevelopmentFloor.updateMany({ _id: { $in: scope.floorIds }, developmentId }, { $set: { deletedAt: now } }, opts);
    await DevelopmentUnit.updateMany({ _id: { $in: scope.unitIds }, developmentId }, { $set: { deletedAt: now, linkedUnitIds: [] } }, opts);
    // Apartments elsewhere drop the parking spots / storage rooms removed here.
    if (scope.unitIds.length) {
      await DevelopmentUnit.updateMany({ developmentId, linkedUnitIds: { $in: scope.unitIds } }, { $pull: { linkedUnitIds: { $in: scope.unitIds } } }, opts);
    }
    await DevelopmentScene.updateMany({ _id: { $in: scope.sceneIds }, developmentId }, { $set: { deletedAt: now } }, opts);
    // Listings stay on the marketplace; they just stop pointing at removed places.
    const detach = { $unset: { unitId: '', floorId: '', buildingId: '', entranceId: '' } };
    if (scope.buildingId) await Property.updateMany({ developmentId, buildingId: scope.buildingId }, detach, opts);
    else await Property.updateMany({ developmentId, floorId: { $in: scope.floorIds } }, detach, opts);

    // Regions on the remaining pictures that pointed at removed places go too,
    // so no picture keeps a dead link (and publishing never trips on one).
    const removed = [scope.buildingId, ...scope.floorIds, ...scope.entranceIds, ...scope.unitIds]
      .filter((id): id is Oid => !!id)
      .map((id) => encodeId(String(id)));
    if (removed.length > 0) {
      const live = { developmentId, deletedAt: null };
      await DevelopmentScene.updateMany(
        { ...live, 'draft.hotspots.linkId': { $in: removed } },
        { $pull: { 'draft.hotspots': { linkId: { $in: removed } } }, $inc: { 'draft.version': 1 } },
        opts
      );
      await DevelopmentScene.updateMany(
        { ...live, 'published.hotspots.linkId': { $in: removed } },
        { $pull: { 'published.hotspots': { linkId: { $in: removed } } } },
        opts
      );
    }

    await recordDevelopmentAudit(
      {
        developmentId,
        action: kind === 'building' ? 'building.delete' : 'floor.delete',
        actorId,
        targetType: kind,
        targetId: (scope.buildingId ?? scope.floorIds[0]) as Oid,
        metadata: { ...toImpact(scope, kind) },
      },
      session
    );
  });
  await recomputeDevelopmentStats(developmentId);
  return toImpact(scope, kind);
};
