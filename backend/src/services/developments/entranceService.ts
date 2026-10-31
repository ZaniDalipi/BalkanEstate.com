/**
 * Entrances of a building: add, change and remove them.
 *
 * - Names are unique within a building (case-insensitive), so buyers never see
 *   two doors called the same.
 * - An entrance that apartments still use can't be removed: unit numbers are
 *   unique per entrance, so dropping it could make two apartments clash. The
 *   owner moves them first; the refusal says how many there are.
 * - Removing one also removes the regions on the pictures that marked it.
 */
import mongoose from 'mongoose';
import DevelopmentBuilding from '../../models/DevelopmentBuilding';
import DevelopmentEntrance, { IDevelopmentEntrance } from '../../models/DevelopmentEntrance';
import DevelopmentFloor from '../../models/DevelopmentFloor';
import DevelopmentScene from '../../models/DevelopmentScene';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import { encodeId } from '../../utils/idObfuscation';
import { recordDevelopmentAudit } from './developmentAudit';
import { requireRefInDevelopment } from './developmentRefs';
import { applyErrorMeta, type ErrorDetails } from './errorMeta';
import { normalizeEntranceInput, sameEntranceName } from './entranceRules';

type Oid = mongoose.Types.ObjectId;
const LIVE = null;

/** 409: the request is fine but clashes with what is already there. */
export class EntranceConflictError extends Error {
  readonly statusCode = 409;
  code?: string;
  details?: ErrorDetails;
  constructor(message: string, code: 'ENTRANCE_NAME_TAKEN' | 'ENTRANCE_IN_USE', field: string | undefined, params: Record<string, string | number>) {
    super(message);
    this.name = 'EntranceConflictError';
    applyErrorMeta(this, { code, field, params });
  }
}

const assertNameFree = async (developmentId: Oid, buildingId: Oid, name: string, exceptId?: Oid): Promise<void> => {
  const siblings = await DevelopmentEntrance.find({ developmentId, buildingId, deletedAt: LIVE }).select('_id name').lean();
  if (siblings.some((e) => sameEntranceName(e.name, name) && String(e._id) !== String(exceptId))) {
    throw new EntranceConflictError(`An entrance called "${name}" already exists in this building`, 'ENTRANCE_NAME_TAKEN', 'name', { name });
  }
};

export const createEntrance = async (params: { developmentId: Oid; actorId: Oid; buildingId: unknown; payload: unknown }): Promise<IDevelopmentEntrance> => {
  const { developmentId, actorId } = params;
  const building = await requireRefInDevelopment(DevelopmentBuilding, params.buildingId, developmentId, 'buildingId');
  const changes = normalizeEntranceInput(params.payload, 'create');
  const buildingId = building._id as Oid;
  await assertNameFree(developmentId, buildingId, changes.$set.name as string);
  if (changes.$set.order === undefined) {
    changes.$set.order = await DevelopmentEntrance.countDocuments({ developmentId, buildingId, deletedAt: LIVE });
  }
  const entrance = await DevelopmentEntrance.create({ developmentId, buildingId, ...changes.$set });
  await recordDevelopmentAudit({
    developmentId,
    action: 'entrance.create',
    actorId,
    targetType: 'entrance',
    targetId: entrance._id as Oid,
    metadata: { name: entrance.name, buildingId: String(buildingId) },
  });
  return entrance;
};

export const updateEntrance = async (params: { developmentId: Oid; actorId: Oid; entranceId: unknown; payload: unknown }): Promise<IDevelopmentEntrance> => {
  const { developmentId, actorId } = params;
  const changes = normalizeEntranceInput(params.payload, 'update');
  const entrance = await requireRefInDevelopment(DevelopmentEntrance, params.entranceId, developmentId, 'entranceId');
  if (changes.$set.name) await assertNameFree(developmentId, entrance.buildingId as Oid, changes.$set.name, entrance._id as Oid);
  const before = entrance.toObject() as unknown as Record<string, unknown>;
  const update: mongoose.UpdateQuery<IDevelopmentEntrance> = {};
  if (Object.keys(changes.$set).length) update.$set = changes.$set;
  if (Object.keys(changes.$unset).length) update.$unset = changes.$unset;
  const updated = await DevelopmentEntrance.findOneAndUpdate({ _id: entrance._id, developmentId, deletedAt: LIVE }, update, { new: true, runValidators: true });
  if (!updated) throw new EntranceConflictError('This entrance was just removed', 'ENTRANCE_IN_USE', undefined, { count: 0 });
  const after = updated.toObject() as unknown as Record<string, unknown>;
  const diff = Object.fromEntries(
    changes.touched.filter((f) => String(before[f] ?? '') !== String(after[f] ?? '')).map((f) => [f, { from: before[f] ?? null, to: after[f] ?? null }])
  );
  if (Object.keys(diff).length) {
    await recordDevelopmentAudit({ developmentId, action: 'entrance.update', actorId, targetType: 'entrance', targetId: updated._id as Oid, metadata: { changes: diff } });
  }
  return updated;
};

export const deleteEntrance = async (params: { developmentId: Oid; actorId: Oid; entranceId: unknown }): Promise<{ regionsRemoved: number }> => {
  const { developmentId, actorId } = params;
  const entrance = await requireRefInDevelopment(DevelopmentEntrance, params.entranceId, developmentId, 'entranceId');
  const entranceId = entrance._id as Oid;
  const units = await DevelopmentUnit.countDocuments({ developmentId, entranceId, deletedAt: LIVE });
  if (units > 0) {
    throw new EntranceConflictError(`${units} units still use this entrance`, 'ENTRANCE_IN_USE', undefined, { count: units, name: entrance.name });
  }
  await DevelopmentEntrance.updateOne({ _id: entranceId, developmentId }, { $set: { deletedAt: new Date() } });
  await DevelopmentFloor.updateMany({ developmentId, entranceId }, { $unset: { entranceId: '' } });
  // Regions marking this entrance go too, so no picture keeps a dead link.
  const linkId = encodeId(String(entranceId));
  const live = { developmentId, deletedAt: null };
  const draft = await DevelopmentScene.updateMany(
    { ...live, 'draft.hotspots.linkId': linkId },
    { $pull: { 'draft.hotspots': { linkId } }, $inc: { 'draft.version': 1 } }
  );
  await DevelopmentScene.updateMany({ ...live, 'published.hotspots.linkId': linkId }, { $pull: { 'published.hotspots': { linkId } } });
  await recordDevelopmentAudit({
    developmentId,
    action: 'entrance.delete',
    actorId,
    targetType: 'entrance',
    targetId: entranceId,
    metadata: { name: entrance.name },
  });
  return { regionsRemoved: draft.modifiedCount };
};
