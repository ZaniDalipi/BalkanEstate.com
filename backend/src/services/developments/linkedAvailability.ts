/**
 * When an apartment's status changes, the seller decides whether the parking
 * spots / storage rooms it comes with change too: nothing happens unless they
 * pick them. Only units the apartment actually comes with can be picked.
 */
import mongoose from 'mongoose';
import DevelopmentUnit from '../../models/DevelopmentUnit';
import type { UnitAvailability } from '../../config/developments';
import { recordDevelopmentAudit } from './developmentAudit';
import { applyAvailabilityTransition } from './developmentInventoryService';
import { toObjectId } from './developmentRefs';
import { UnitLinkError } from './unitLinks';

const LIVE = { $exists: false } as const;

/**
 * Validate `raw` (the picked ids) against what the apartment comes with.
 * `changesAvailability` says whether the same request changes its status.
 */
export function parseAlsoLinked(
  raw: unknown,
  comesWith: ReadonlyArray<unknown>,
  changesAvailability: boolean
): mongoose.Types.ObjectId[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new UnitLinkError('alsoLinkedUnitIds must be a list of unit ids');
  if (raw.length === 0) return [];
  if (!changesAvailability) {
    throw new UnitLinkError('Parking spots and storage rooms can only follow a change of status');
  }
  const allowed = new Set(comesWith.map(String));
  const ids = raw.map((x) => toObjectId(x));
  if (ids.some((id) => !id || !allowed.has(String(id)))) {
    throw new UnitLinkError('Only the parking spots and storage rooms this unit comes with can be updated with it');
  }
  return [...new Map(ids.map((id) => [String(id), id as mongoose.Types.ObjectId])).values()];
}

/** Give the picked units the apartment's new status: audit, stats and follower alerts as usual. */
export async function applyToLinkedUnits(
  developmentId: mongoose.Types.ObjectId,
  ids: mongoose.Types.ObjectId[],
  availability: UnitAvailability,
  actorId: mongoose.Types.ObjectId | string,
  viaUnitNumber: string
): Promise<number> {
  if (ids.length === 0) return 0;
  const units = await DevelopmentUnit.find({ _id: { $in: ids }, developmentId, deletedAt: LIVE, availability: { $ne: availability } });
  const transitions = [];
  for (const unit of units) {
    const prior = unit.availability;
    unit.availability = availability;
    // eslint-disable-next-line no-await-in-loop
    await unit.save();
    // eslint-disable-next-line no-await-in-loop
    await recordDevelopmentAudit({
      developmentId,
      action: 'availability.change',
      actorId,
      targetType: 'unit',
      targetId: unit._id as mongoose.Types.ObjectId,
      metadata: { availability, from: prior, with: viaUnitNumber },
    });
    transitions.push({ prior, unit });
  }
  if (transitions.length) await applyAvailabilityTransition(developmentId, transitions);
  return transitions.length;
}

/** For bulk updates: the units the selected ones come with (added when the seller asks). */
export async function linkedIdsOf(developmentId: mongoose.Types.ObjectId, ids: mongoose.Types.ObjectId[]) {
  const owners = await DevelopmentUnit.find({ _id: { $in: ids }, developmentId, deletedAt: LIVE }).select('linkedUnitIds').lean();
  return owners.flatMap((o) => o.linkedUnitIds ?? []);
}
