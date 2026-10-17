import mongoose from 'mongoose';
import Property, { IProperty } from '../../models/Property';
import Agency from '../../models/Agency';
import DevelopmentUnit, { IDevelopmentUnit } from '../../models/DevelopmentUnit';
import DevelopmentAuditLog from '../../models/DevelopmentAuditLog';
import { IUser } from '../../models/User';
import { createLogger } from '../../utils/logger';
import { withOptionalTransaction } from '../../utils/withOptionalTransaction';
import { recomputeDevelopmentStats, ValidationError } from './developmentService';

const log = createLogger('DevelopmentListingService');

/**
 * Attachment links an EXISTING listing to a physical unit. It never creates,
 * duplicates, republishes, or resets a listing — it only sets the listing's
 * optional development refs and records the listing on the unit. These are the
 * invariants §3.3 of the design guarantees.
 */

export type ConflictCode =
  | 'listing_already_attached_elsewhere'
  | 'listing_not_controlled_by_caller'
  | 'unit_in_other_development'
  | 'listing_archived_or_sold'
  | 'already_attached_to_this_unit';

export interface AttachmentConflict {
  code: ConflictCode;
  message: string;
  /** True when --force cannot and must not override it (hard conflict). */
  blocking: boolean;
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  constructor(public readonly conflicts: AttachmentConflict[]) {
    super('Attachment has unresolved conflicts');
    this.name = 'ConflictError';
  }
}

export class AuthorizationError extends Error {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Whether the caller controls the LISTING (not the development). They do if
 * they are the listing's seller, or an owner/admin of the agency the listing
 * was created under. This is independent of development permissions — both are
 * required to attach.
 */
export const callerControlsListing = async (
  user: IUser,
  property: Pick<IProperty, 'sellerId' | 'createdByAgencyId'>
): Promise<boolean> => {
  const userId = String(user._id);
  if (String(property.sellerId) === userId) return true;

  if (property.createdByAgencyId) {
    const agency = await Agency.findById(property.createdByAgencyId)
      .select('ownerId admins')
      .lean();
    if (agency) {
      if (String(agency.ownerId) === userId) return true;
      if ((agency.admins ?? []).some((a) => String(a) === userId)) return true;
    }
  }
  return false;
};

/**
 * Pure conflict detection — no database writes — so it is unit-testable and so
 * the controller can preview conflicts before committing. `controlsListing` is
 * resolved by the caller (it needs a DB lookup) and passed in.
 *
 * A conflict is NEVER silently overridden: blocking conflicts always stop the
 * attach; non-blocking ones stop it unless the caller explicitly passes force.
 */
export const detectAttachmentConflicts = (params: {
  property: Pick<IProperty, '_id' | 'status' | 'developmentId' | 'unitId'>;
  unit: Pick<IDevelopmentUnit, '_id' | 'developmentId' | 'listingIds'>;
  targetDevelopmentId: string;
  controlsListing: boolean;
}): AttachmentConflict[] => {
  const { property, unit, targetDevelopmentId, controlsListing } = params;
  const conflicts: AttachmentConflict[] = [];

  if (!controlsListing) {
    conflicts.push({
      code: 'listing_not_controlled_by_caller',
      message: 'You do not control this listing and cannot attach it.',
      blocking: true,
    });
  }

  if (property.status === 'sold' || property.status === 'rented') {
    conflicts.push({
      code: 'listing_archived_or_sold',
      message: `This listing is ${property.status} and cannot be attached.`,
      blocking: true,
    });
  }

  // The unit must belong to the development we are attaching into.
  if (String(unit.developmentId) !== String(targetDevelopmentId)) {
    conflicts.push({
      code: 'unit_in_other_development',
      message: 'The target unit belongs to a different development.',
      blocking: true,
    });
  }

  const alreadyOnThisUnit =
    (unit.listingIds ?? []).some((id) => String(id) === String(property._id)) ||
    (property.unitId && String(property.unitId) === String(unit._id));
  if (alreadyOnThisUnit) {
    conflicts.push({
      code: 'already_attached_to_this_unit',
      message: 'This listing is already attached to this unit.',
      blocking: false,
    });
  }

  // Attached to a DIFFERENT unit/development already — soft conflict the caller
  // can override, which re-homes the listing (never silently).
  if (
    property.unitId &&
    String(property.unitId) !== String(unit._id)
  ) {
    conflicts.push({
      code: 'listing_already_attached_elsewhere',
      message:
        'This listing is already attached to another unit. Re-attaching will move it.',
      blocking: false,
    });
  }

  return conflicts;
};

export interface AttachParams {
  user: IUser;
  developmentId: string;
  unitId: string;
  listingId: string;
  /** Override non-blocking conflicts (e.g. re-homing). Never overrides blocking ones. */
  force?: boolean;
}

export interface AttachResult {
  unit: IDevelopmentUnit;
  listingId: string;
  conflicts: AttachmentConflict[];
}

/**
 * Attach one existing listing to a unit. Preserves the listing entirely; only
 * the optional refs and the unit's listing set change. Runs the two writes
 * atomically where the topology allows (see withOptionalTransaction).
 */
export const attachListingToUnit = async (
  params: AttachParams
): Promise<AttachResult> => {
  const { user, developmentId, unitId, listingId, force } = params;

  const [property, unit] = await Promise.all([
    Property.findById(listingId),
    DevelopmentUnit.findOne({ _id: unitId, deletedAt: { $exists: false } }),
  ]);
  if (!property) throw new NotFoundError('Listing not found');
  if (!unit) throw new NotFoundError('Unit not found');

  const controlsListing = await callerControlsListing(user, property);
  const conflicts = detectAttachmentConflicts({
    property,
    unit,
    targetDevelopmentId: developmentId,
    controlsListing,
  });

  const blocking = conflicts.filter((c) => c.blocking);
  const nonBlockingUnresolved = conflicts.filter(
    (c) => !c.blocking && c.code !== 'already_attached_to_this_unit'
  );
  if (blocking.length > 0) throw new ConflictError(conflicts);
  if (nonBlockingUnresolved.length > 0 && !force) throw new ConflictError(conflicts);

  // Idempotent no-op if it is already exactly here.
  const alreadyHere =
    String(property.unitId ?? '') === String(unit._id) &&
    (unit.listingIds ?? []).some((id) => String(id) === String(property._id));
  if (alreadyHere) {
    return { unit, listingId, conflicts };
  }

  await withOptionalTransaction(async (session) => {
    // If re-homing, remove the listing from its previous unit first.
    if (property.unitId && String(property.unitId) !== String(unit._id)) {
      const previousUnitId = property.unitId as mongoose.Types.ObjectId;
      await DevelopmentUnit.updateOne(
        { _id: previousUnitId },
        { $pull: { listingIds: property._id } },
        { session }
      );
      await demotePrimaryIfNeeded(
        previousUnitId,
        property._id as mongoose.Types.ObjectId,
        session
      );
    }

    // Point the listing at the unit (and its ancestry).
    property.developmentId = new mongoose.Types.ObjectId(developmentId);
    property.buildingId = unit.buildingId;
    property.entranceId = unit.entranceId;
    property.floorId = unit.floorId;
    property.unitId = unit._id as mongoose.Types.ObjectId;
    await property.save({ session });

    // Record the listing on the unit; first listing becomes primary.
    const update: mongoose.UpdateQuery<IDevelopmentUnit> = {
      $addToSet: { listingIds: property._id },
    };
    if (!unit.primaryListingId) update.$set = { primaryListingId: property._id };
    await DevelopmentUnit.updateOne({ _id: unit._id }, update, { session });

    await DevelopmentAuditLog.create(
      [
        {
          developmentId,
          action: 'listing.attach',
          actorId: user._id,
          targetType: 'unit',
          targetId: unit._id,
          metadata: { listingId: String(property._id), force: !!force },
        },
      ],
      { session }
    );
  });

  await recomputeDevelopmentStats(developmentId);
  const fresh = await DevelopmentUnit.findById(unit._id);
  log.info(`Listing ${listingId} attached to unit ${unitId} in development ${developmentId}`);
  return { unit: fresh as IDevelopmentUnit, listingId, conflicts };
};

/**
 * Detach a listing from its unit. Clears the listing's refs and removes it from
 * the unit; the listing, its media, history and leads are untouched, and the
 * physical unit is never deleted.
 */
export const detachListingFromUnit = async (params: {
  user: IUser;
  developmentId: string;
  unitId: string;
  listingId: string;
}): Promise<IDevelopmentUnit> => {
  const { user, developmentId, unitId, listingId } = params;

  const [property, unit] = await Promise.all([
    Property.findById(listingId),
    DevelopmentUnit.findOne({ _id: unitId, deletedAt: { $exists: false } }),
  ]);
  if (!property) throw new NotFoundError('Listing not found');
  if (!unit) throw new NotFoundError('Unit not found');

  if (String(unit.developmentId) !== String(developmentId)) {
    throw new ValidationError('Unit does not belong to this development');
  }
  // Authorization for detach is the development `listing.detach` permission,
  // already enforced by the route. Either controlling the listing or holding
  // that development permission is sufficient, so no extra check is needed here.

  await withOptionalTransaction(async (session) => {
    property.developmentId = undefined;
    property.buildingId = undefined;
    property.entranceId = undefined;
    property.floorId = undefined;
    property.unitId = undefined;
    await property.save({ session });

    await DevelopmentUnit.updateOne(
      { _id: unit._id },
      { $pull: { listingIds: property._id } },
      { session }
    );
    await demotePrimaryIfNeeded(unit._id as mongoose.Types.ObjectId, property._id as mongoose.Types.ObjectId, session);

    await DevelopmentAuditLog.create(
      [
        {
          developmentId,
          action: 'listing.detach',
          actorId: user._id,
          targetType: 'unit',
          targetId: unit._id,
          metadata: { listingId: String(property._id) },
        },
      ],
      { session }
    );
  });

  await recomputeDevelopmentStats(developmentId);
  log.info(`Listing ${listingId} detached from unit ${unitId}`);
  return (await DevelopmentUnit.findById(unit._id)) as IDevelopmentUnit;
};

/**
 * Re-elect a unit's primary listing after the current primary is removed:
 * promote the first remaining listing, or clear it when none remain.
 */
const demotePrimaryIfNeeded = async (
  unitId: mongoose.Types.ObjectId,
  removedListingId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession | undefined
): Promise<void> => {
  const unit = await DevelopmentUnit.findById(unitId).session(session ?? null);
  if (!unit) return;
  if (String(unit.primaryListingId ?? '') !== String(removedListingId)) return;

  const remaining = (unit.listingIds ?? []).filter(
    (id) => String(id) !== String(removedListingId)
  );
  await DevelopmentUnit.updateOne(
    { _id: unitId },
    remaining.length > 0
      ? { $set: { primaryListingId: remaining[0] } }
      : { $unset: { primaryListingId: '' } },
    { session }
  );
};

/**
 * Associate a listing with a development at the development level (no specific
 * unit). Used by the "attach to this nearby development" suggestion during
 * listing editing. Caller must control the listing (checked here); the route
 * already enforced the caller's development attach permission. If the listing
 * was previously on a unit, it is cleanly removed from that unit first.
 */
export const attachListingToDevelopmentLevel = async (params: {
  user: IUser;
  developmentId: string;
  listingId: string;
}): Promise<IProperty> => {
  const { user, developmentId, listingId } = params;
  const property = await Property.findById(listingId);
  if (!property) throw new NotFoundError('Listing not found');
  if (!(await callerControlsListing(user, property))) {
    throw new AuthorizationError('You do not control this listing.');
  }
  if (property.status === 'sold' || property.status === 'rented') {
    throw new ValidationError(`This listing is ${property.status} and cannot be attached.`);
  }

  // Idempotent no-op if already associated with exactly this development and no unit.
  if (String(property.developmentId ?? '') === String(developmentId) && !property.unitId) {
    return property;
  }

  await withOptionalTransaction(async (session) => {
    // Remove from any previous unit so inventory stays consistent.
    if (property.unitId) {
      await DevelopmentUnit.updateOne(
        { _id: property.unitId },
        { $pull: { listingIds: property._id } },
        { session }
      );
      await demotePrimaryIfNeeded(
        property.unitId as mongoose.Types.ObjectId,
        property._id as mongoose.Types.ObjectId,
        session
      );
    }
    property.developmentId = new mongoose.Types.ObjectId(developmentId);
    property.buildingId = undefined;
    property.entranceId = undefined;
    property.floorId = undefined;
    property.unitId = undefined;
    await property.save({ session });

    await DevelopmentAuditLog.create(
      [
        {
          developmentId,
          action: 'listing.attach',
          actorId: user._id,
          targetType: 'development',
          metadata: { listingId: String(property._id), level: 'development' },
        },
      ],
      { session }
    );
  });

  await recomputeDevelopmentStats(developmentId);
  log.info(`Listing ${listingId} attached at development level to ${developmentId}`);
  return (await Property.findById(listingId)) as IProperty;
};

export interface BulkAttachItem {
  listingId: string;
  unitId: string;
}

export interface BulkAttachResult {
  attached: string[];
  failed: { listingId: string; unitId: string; reason: string }[];
}

/**
 * Attach several listings in one call. Each item is attempted independently so
 * one conflict does not sink the whole batch; the result reports what attached
 * and why anything failed.
 */
export const bulkAttach = async (params: {
  user: IUser;
  developmentId: string;
  items: BulkAttachItem[];
  force?: boolean;
}): Promise<BulkAttachResult> => {
  const { user, developmentId, items, force } = params;
  const result: BulkAttachResult = { attached: [], failed: [] };

  for (const item of items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await attachListingToUnit({
        user,
        developmentId,
        unitId: item.unitId,
        listingId: item.listingId,
        force,
      });
      result.attached.push(item.listingId);
    } catch (error) {
      result.failed.push({
        listingId: item.listingId,
        unitId: item.unitId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
};
