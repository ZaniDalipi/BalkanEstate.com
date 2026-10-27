/**
 * Dashboard unit administration: listing, editing, deleting, bulk edits, CSV
 * export, floorplan upload, and building/floor edits.
 *
 * Every function here is scoped to ONE development (the one the route's
 * developmentAuth resolved). Client ids arrive encoded and are resolved via
 * developmentRefs, so an id from another development is a 404, never a write.
 */
import mongoose from 'mongoose';
import Property from '../../models/Property';
import DevelopmentBuilding, { IDevelopmentBuilding } from '../../models/DevelopmentBuilding';
import DevelopmentFloor, { IDevelopmentFloor } from '../../models/DevelopmentFloor';
import DevelopmentUnit, { IDevelopmentUnit } from '../../models/DevelopmentUnit';
import { IDevelopment } from '../../models/Development';
import { encodeId } from '../../utils/idObfuscation';
import { escapeRegex } from '../../utils/escapeRegex';
import { createLogger } from '../../utils/logger';
import { withOptionalTransaction } from '../../utils/withOptionalTransaction';
import { uploadImage, deleteImage, isMediaStorageConfigured } from '../mediaService';
import {
  FLOOR_KINDS,
  PRICE_VISIBILITIES,
  UNIT_AVAILABILITY_STATES,
  UNIT_FEATURES,
  UNIT_VISIBILITIES,
  isPriceVisibility,
  isUnitAvailability,
  isUnitFeature,
  isUnitVisibility,
  roleHasPermission,
  type DevelopmentPermission,
  type DevelopmentRole,
  type UnitAvailability,
} from '../../config/developments';
import { recomputeDevelopmentStats, ValidationError } from './developmentService';
import { AuthorizationError, NotFoundError } from './developmentListingService';
import { requireRefInDevelopment, toObjectId } from './developmentRefs';
import { recordDevelopmentAudit, diffFields } from './developmentAudit';
import { applyAvailabilityTransition, isDuplicateKeyError } from './developmentInventoryService';
import { assertUnitValue } from './unitRules';
import { resolveEffectiveAvailability, type AvailabilitySource } from './unitAvailability';
import { assertTypeChangeKeepsLinks, resolveLinkedUnits, unlinkEverywhere, UnitLinkConflictError } from './unitLinks';

const log = createLogger('UnitAdminService');

type Id = mongoose.Types.ObjectId | string;

/** A 409 for a unit-number clash, with a message the editor can show. */
class UnitConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'UnitConflictError';
  }
}

const LIVE = { $exists: false } as const;

// ---------------------------------------------------------------------------
// DashboardUnit projection
// ---------------------------------------------------------------------------

export interface DashboardUnitJSON extends Record<string, unknown> {
  effectiveAvailability: UnitAvailability;
  availabilitySource: AvailabilitySource;
  buildingName: string | null;
  floorLabel: string | null;
  floorLevel: number | null;
  linkedListings: Array<{ id: string; title: string; status: string }>;
  /** For a parking spot / storage room: the units it comes with (so the editor can show it is taken). */
  soldWith: Array<{ id: string; unitNumber: string }>;
}

/**
 * Enrich units for the dashboard with ONE batched Property query (statuses and
 * titles of every linked listing) and one query each for buildings/floors.
 */
const withoutPublicId = (img: unknown): unknown => {
  if (!img || typeof img !== 'object') return img;
  const { publicId: _omit, ...rest } = img as Record<string, unknown>;
  return rest;
};

export const toDashboardUnits = async (
  developmentId: Id,
  units: IDevelopmentUnit[]
): Promise<DashboardUnitJSON[]> => {
  if (units.length === 0) return [];
  const listingIds = Array.from(
    new Set(units.flatMap((u) => (u.listingIds ?? []).map(String)))
  ).map((id) => new mongoose.Types.ObjectId(id));
  const buildingIds = Array.from(new Set(units.map((u) => String(u.buildingId))));
  const floorIds = Array.from(new Set(units.map((u) => String(u.floorId))));

  const [listings, buildings, floors, owners] = await Promise.all([
    listingIds.length
      ? Property.find({ _id: { $in: listingIds } }).select('title status').lean()
      : Promise.resolve([]),
    DevelopmentBuilding.find({ _id: { $in: buildingIds }, developmentId }).select('name').lean(),
    DevelopmentFloor.find({ _id: { $in: floorIds }, developmentId }).select('label level').lean(),
    DevelopmentUnit.find({ developmentId, deletedAt: LIVE, linkedUnitIds: { $in: units.map((u) => u._id) } })
      .select('unitNumber linkedUnitIds')
      .lean(),
  ]);
  const listingById = new Map(listings.map((l) => [String(l._id), l]));
  const buildingName = new Map(buildings.map((b) => [String(b._id), b.name]));
  const floorById = new Map(floors.map((f) => [String(f._id), f]));

  return units.map((u) => {
    const linked = (u.listingIds ?? [])
      .map((id) => listingById.get(String(id)))
      .filter((l): l is NonNullable<typeof l> => !!l);
    const effective = resolveEffectiveAvailability(
      u.availability,
      linked.map((l) => l.status)
    );
    const floor = floorById.get(String(u.floorId));
    const json = u.toJSON() as Record<string, unknown>;
    // Storage keys stay server-side; the dashboard only needs URLs.
    if (json.floorplan) json.floorplan = withoutPublicId(json.floorplan);
    if (Array.isArray(json.gallery)) json.gallery = json.gallery.map(withoutPublicId);
    return {
      ...json,
      effectiveAvailability: effective.availability,
      availabilitySource: effective.source,
      buildingName: buildingName.get(String(u.buildingId)) ?? null,
      floorLabel: floor?.label ?? null,
      floorLevel: floor?.level ?? null,
      linkedListings: linked.map((l) => ({
        id: encodeId(String(l._id)),
        title: l.title ?? '',
        status: String(l.status ?? ''),
      })),
      soldWith: owners
        .filter((o) => (o.linkedUnitIds ?? []).some((id) => String(id) === String(u._id)))
        .map((o) => ({ id: encodeId(String(o._id)), unitNumber: o.unitNumber })),
    };
  });
};

const toDashboardUnit = async (developmentId: Id, unit: IDevelopmentUnit): Promise<DashboardUnitJSON> =>
  (await toDashboardUnits(developmentId, [unit]))[0];

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export const UNIT_SORTS = [
  'unitNumber',
  '-unitNumber',
  'price',
  '-price',
  'floor',
  '-floor',
  'updatedAt',
  '-updatedAt',
] as const;
export type UnitSort = (typeof UNIT_SORTS)[number];

export interface UnitListQuery {
  search?: unknown;
  buildingId?: unknown;
  floorId?: unknown;
  availability?: unknown;
  visibility?: unknown;
  /** Comma-separated unit types (e.g. "parking,storage"). */
  unitType?: unknown;
  /** 'true' → only units with at least one linked listing; 'false' → only units without. */
  hasListing?: unknown;
  /** Comma-separated unit ids (encoded or raw, ≤200): fetch exactly these units. */
  ids?: unknown;
  sort?: unknown;
  limit?: unknown;
  skip?: unknown;
}

const present = (v: unknown): boolean => v !== undefined && v !== null && v !== '';

/** Unit numbers sort naturally ("2" before "10"). */
const NUMERIC_COLLATION = { locale: 'en', numericOrdering: true } as const;

export const listDashboardUnits = async (
  developmentId: mongoose.Types.ObjectId,
  q: UnitListQuery
): Promise<{ units: DashboardUnitJSON[]; total: number }> => {
  const match: Record<string, unknown> = { developmentId, deletedAt: LIVE };

  if (present(q.buildingId)) {
    const id = toObjectId(q.buildingId);
    if (!id) throw new ValidationError('Invalid buildingId');
    match.buildingId = id;
  }
  if (present(q.floorId)) {
    const id = toObjectId(q.floorId);
    if (!id) throw new ValidationError('Invalid floorId');
    match.floorId = id;
  }
  if (present(q.availability)) {
    if (!isUnitAvailability(q.availability)) {
      throw new ValidationError(`availability must be one of: ${UNIT_AVAILABILITY_STATES.join(', ')}`);
    }
    match.availability = q.availability;
  }
  if (present(q.visibility)) {
    if (!isUnitVisibility(q.visibility)) {
      throw new ValidationError(`visibility must be one of: ${UNIT_VISIBILITIES.join(', ')}`);
    }
    // Legacy units predate the field; treat missing as public.
    match.visibility = q.visibility === 'public' ? { $ne: 'hidden' } : 'hidden';
  }
  if (present(q.ids)) {
    if (typeof q.ids !== 'string') throw new ValidationError('ids must be a comma-separated string');
    const parts = q.ids.split(',').map((x) => x.trim()).filter(Boolean);
    if (parts.length > 200) throw new ValidationError('ids accepts at most 200 ids');
    const ids = parts.map((x) => toObjectId(x));
    if (ids.some((id) => !id)) throw new ValidationError('Invalid id in ids');
    match._id = { $in: ids };
  }
  if (present(q.unitType)) {
    if (typeof q.unitType !== 'string') throw new ValidationError('unitType must be a comma-separated string');
    const types = q.unitType.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 20);
    if (types.length) match.unitType = { $in: types };
  }
  if (present(q.hasListing)) {
    if (q.hasListing !== 'true' && q.hasListing !== 'false') {
      throw new ValidationError('hasListing must be true or false');
    }
    match['listingIds.0'] = { $exists: q.hasListing === 'true' };
  }
  if (present(q.search)) {
    if (typeof q.search !== 'string') throw new ValidationError('search must be a string');
    const term = q.search.trim().slice(0, 100);
    if (term) match.unitNumber = { $regex: escapeRegex(term), $options: 'i' };
  }

  const sort: UnitSort = present(q.sort) ? (q.sort as UnitSort) : 'unitNumber';
  if (!(UNIT_SORTS as readonly string[]).includes(String(sort))) {
    throw new ValidationError(`sort must be one of: ${UNIT_SORTS.join(', ')}`);
  }
  const rawLimit = Number(q.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50;
  const rawSkip = Number(q.skip);
  const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0;

  const dir: 1 | -1 = sort.startsWith('-') ? -1 : 1;
  const key = sort.replace(/^-/, '');

  let units: IDevelopmentUnit[];
  if (key === 'floor') {
    // Floor order is the floor's numeric level, which lives on the floor.
    const rows = await DevelopmentUnit.aggregate([
      { $match: match },
      {
        $lookup: {
          from: DevelopmentFloor.collection.name,
          localField: 'floorId',
          foreignField: '_id',
          as: '__floor',
          pipeline: [{ $project: { level: 1 } }],
        },
      },
      { $addFields: { __floorLevel: { $ifNull: [{ $first: '$__floor.level' }, null] } } },
      { $sort: { __floorLevel: dir, unitNumber: dir, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { __floor: 0, __floorLevel: 0 } },
    ]).collation(NUMERIC_COLLATION);
    units = rows.map((r) => DevelopmentUnit.hydrate(r) as IDevelopmentUnit);
  } else {
    const sortSpec: Record<string, 1 | -1> =
      key === 'unitNumber' ? { unitNumber: dir, _id: 1 } : { [key]: dir, unitNumber: 1, _id: 1 };
    units = await DevelopmentUnit.find(match)
      .collation(NUMERIC_COLLATION)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit);
  }

  const [enriched, total] = await Promise.all([
    toDashboardUnits(developmentId, units),
    DevelopmentUnit.countDocuments(match),
  ]);
  return { units: enriched, total };
};

// ---------------------------------------------------------------------------
// Update (field-level authorization)
// ---------------------------------------------------------------------------

const PRICE_FIELDS = ['price', 'currency', 'pricePerSqm', 'priceVisibility'] as const;
const AVAILABILITY_FIELDS = ['availability'] as const;
const NUMBER_FIELDS = [
  'beds',
  'baths',
  'livingRooms',
  'totalArea',
  'netArea',
  'grossArea',
  'externalArea',
  'terraceArea',
  'balconies',
  'terraces',
  'price',
  'pricePerSqm',
] as const;
const STRING_FIELDS: Record<string, number> = {
  orientation: 60,
  viewType: 60,
  description: 4000,
  currency: 8,
};
const REQUIRED_STRING_FIELDS: Record<string, number> = { unitNumber: 50, unitType: 60 };
const UPDATABLE_FIELDS = [
  'unitNumber',
  'unitType',
  'buildingId',
  'floorId',
  ...NUMBER_FIELDS,
  'orientation',
  'viewType',
  'description',
  'currency',
  'features',
  'visibility',
  'priceVisibility',
  'availability',
  'linkedUnitIds',
] as const;

/** The permission a touched field requires. */
export const permissionForUnitField = (field: string): DevelopmentPermission => {
  if ((PRICE_FIELDS as readonly string[]).includes(field)) return 'price.change';
  if ((AVAILABILITY_FIELDS as readonly string[]).includes(field)) return 'availability.change';
  return 'unit.manage';
};

export const assertAllowed = (role: DevelopmentRole | undefined, fields: string[]): void => {
  const needed = new Set(fields.map(permissionForUnitField));
  const denied = [...needed].filter((p) => !role || !roleHasPermission(role, p));
  if (denied.length > 0) {
    throw new AuthorizationError(
      `You do not have permission to change these fields (requires ${denied.join(', ')})`
    );
  }
};

export interface UpdateUnitParams {
  developmentId: mongoose.Types.ObjectId;
  role: DevelopmentRole | undefined;
  actorId: Id;
  unitId: unknown;
  payload: unknown;
}

export const updateUnit = async (params: UpdateUnitParams): Promise<DashboardUnitJSON> => {
  const { developmentId, role, actorId } = params;
  if (!params.payload || typeof params.payload !== 'object' || Array.isArray(params.payload)) {
    throw new ValidationError('Request body must be an object');
  }
  const body = params.payload as Record<string, unknown>;
  const touched = (UPDATABLE_FIELDS as readonly string[]).filter((f) => body[f] !== undefined);
  if (touched.length === 0) throw new ValidationError('No updatable fields supplied');

  // Authorization first: a caller lacking a permission learns nothing more.
  assertAllowed(role, touched);

  const unit = await requireRefInDevelopment(DevelopmentUnit, params.unitId, developmentId, 'unitId');
  const before = unit.toObject() as unknown as Record<string, unknown>;

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};

  for (const field of touched) {
    const value = body[field];
    if ((NUMBER_FIELDS as readonly string[]).includes(field)) {
      if (value === null) $unset[field] = '';
      else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new ValidationError(`${field} must be a non-negative number or null`);
      } else $set[field] = value;
    } else if (field in STRING_FIELDS) {
      if (value === null) $unset[field] = '';
      else if (typeof value !== 'string') throw new ValidationError(`${field} must be a string or null`);
      else {
        const v = value.trim();
        if (v.length > STRING_FIELDS[field]) {
          throw new ValidationError(`${field} must be at most ${STRING_FIELDS[field]} characters`);
        }
        if (v) {
          assertUnitValue(field, v);
          $set[field] = field === 'currency' ? v.toUpperCase() : v;
        } else $unset[field] = '';
      }
    } else if (field in REQUIRED_STRING_FIELDS) {
      if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${field} is required`);
      if (value.trim().length > REQUIRED_STRING_FIELDS[field]) {
        throw new ValidationError(`${field} must be at most ${REQUIRED_STRING_FIELDS[field]} characters`);
      }
      $set[field] = value.trim();
    } else if (field === 'features') {
      if (value === null) $set.features = [];
      else if (!Array.isArray(value) || !value.every(isUnitFeature)) {
        throw new ValidationError(`features must be a list of: ${UNIT_FEATURES.join(', ')}`);
      } else $set.features = Array.from(new Set(value));
    } else if (field === 'visibility') {
      if (!isUnitVisibility(value)) {
        throw new ValidationError(`visibility must be one of: ${UNIT_VISIBILITIES.join(', ')}`);
      }
      $set.visibility = value;
    } else if (field === 'priceVisibility') {
      if (!isPriceVisibility(value)) {
        throw new ValidationError(`priceVisibility must be one of: ${PRICE_VISIBILITIES.join(', ')}`);
      }
      $set.priceVisibility = value;
    } else if (field === 'availability') {
      if (!isUnitAvailability(value)) {
        throw new ValidationError(`availability must be one of: ${UNIT_AVAILABILITY_STATES.join(', ')}`);
      }
      $set.availability = value;
    }
  }

  // What it comes with (parking spots, storage rooms), and a type change that would break a link.
  const nextType = String($set.unitType ?? unit.unitType);
  if (touched.includes('linkedUnitIds')) {
    $set.linkedUnitIds = await resolveLinkedUnits(developmentId, unit, body.linkedUnitIds, nextType);
  }
  if (touched.includes('unitType') && nextType !== unit.unitType) {
    await assertTypeChangeKeepsLinks(developmentId, unit, nextType, $set.linkedUnitIds as unknown[] | undefined);
  }

  // Placement: building and floor are resolved inside this development, and the
  // resulting floor must belong to the resulting building.
  if (touched.includes('buildingId') || touched.includes('floorId')) {
    if (body.buildingId === null || body.floorId === null) {
      throw new ValidationError('buildingId and floorId cannot be cleared');
    }
    const building = touched.includes('buildingId')
      ? await requireRefInDevelopment(DevelopmentBuilding, body.buildingId, developmentId, 'buildingId')
      : null;
    const floor = touched.includes('floorId')
      ? await requireRefInDevelopment(DevelopmentFloor, body.floorId, developmentId, 'floorId')
      : await DevelopmentFloor.findOne({ _id: unit.floorId, developmentId });
    const buildingId = building ? building._id : unit.buildingId;
    if (!floor || String(floor.buildingId) !== String(buildingId)) {
      throw new ValidationError('floorId must belong to the building');
    }
    $set.buildingId = buildingId;
    $set.floorId = floor._id;
    // An entrance belongs to one building; moving building drops it.
    if (String(buildingId) !== String(unit.buildingId) && unit.entranceId) $unset.entranceId = '';
  }

  const update: mongoose.UpdateQuery<IDevelopmentUnit> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  let updated: IDevelopmentUnit | null;
  try {
    updated = await DevelopmentUnit.findOneAndUpdate(
      { _id: unit._id, developmentId, deletedAt: LIVE },
      update,
      { new: true, runValidators: true }
    );
  } catch (error) {
    if (isDuplicateKeyError(error) && String((error as Error).message).includes('linked_unit_once')) {
      throw new UnitLinkConflictError('One of these spots was just added to another unit. Reload and try again.');
    }
    if (isDuplicateKeyError(error)) {
      throw new UnitConflictError(`A unit numbered "${String($set.unitNumber ?? unit.unitNumber)}" already exists here`);
    }
    throw error;
  }
  if (!updated) throw new NotFoundError('unitId not found in this development');

  const after = updated.toObject() as unknown as Record<string, unknown>;
  const changes = diffFields(before, after, touched.concat(touched.includes('buildingId') || touched.includes('floorId') ? ['entranceId'] : []));

  if (Object.keys(changes).length > 0) {
    await recordDevelopmentAudit({
      developmentId,
      action: 'unit.update',
      actorId,
      targetType: 'unit',
      targetId: updated._id as mongoose.Types.ObjectId,
      metadata: { changes: serializeChanges(changes) },
    });
  }
  if (changes.price) {
    await recordDevelopmentAudit({
      developmentId,
      action: 'price.change',
      actorId,
      targetType: 'unit',
      targetId: updated._id as mongoose.Types.ObjectId,
      metadata: { from: changes.price.from, to: changes.price.to, currency: updated.currency ?? null },
    });
  }
  if (changes.availability) {
    await recordDevelopmentAudit({
      developmentId,
      action: 'availability.change',
      actorId,
      targetType: 'unit',
      targetId: updated._id as mongoose.Types.ObjectId,
      metadata: { availability: updated.availability, from: changes.availability.from },
    });
    // Same side effects as PATCH .../availability: stats + follower alerts.
    await applyAvailabilityTransition(developmentId, [
      { prior: before.availability as UnitAvailability, unit: updated },
    ]);
  }

  return toDashboardUnit(developmentId, updated);
};

/** ObjectIds in an audit diff are stored as strings so the trail is readable. */
const serializeChanges = (
  changes: Record<string, { from: unknown; to: unknown }>
): Record<string, { from: unknown; to: unknown }> => {
  const s = (v: unknown) => (v instanceof mongoose.Types.ObjectId ? String(v) : v);
  return Object.fromEntries(
    Object.entries(changes).map(([k, c]) => [k, { from: s(c.from), to: s(c.to) }])
  );
};

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/**
 * Soft-delete a unit. Listings attached to it keep their development-level
 * association but lose the unit/floor/building refs, so no listing points at a
 * unit that no longer exists. The listings themselves are never modified
 * otherwise.
 */
export const softDeleteUnit = async (params: {
  developmentId: mongoose.Types.ObjectId;
  actorId: Id;
  unitId: unknown;
}): Promise<void> => {
  const { developmentId, actorId } = params;
  const unit = await requireRefInDevelopment(DevelopmentUnit, params.unitId, developmentId, 'unitId');
  let detached = 0;
  await withOptionalTransaction(async (session) => {
    // A deleted unit keeps no links, so its spots can come with another unit.
    await DevelopmentUnit.updateOne(
      { _id: unit._id, developmentId },
      { $set: { deletedAt: new Date(), linkedUnitIds: [] } },
      { session }
    );
    const res = await Property.updateMany(
      { unitId: unit._id },
      { $unset: { unitId: '', floorId: '', buildingId: '', entranceId: '' } },
      { session }
    );
    detached = res.modifiedCount ?? 0;
    await recordDevelopmentAudit(
      {
        developmentId,
        action: 'unit.delete',
        actorId,
        targetType: 'unit',
        targetId: unit._id as mongoose.Types.ObjectId,
        metadata: { unitNumber: unit.unitNumber, detachedListings: detached },
      },
      session
    );
  });
  // No apartment keeps a deleted parking spot or storage room.
  await unlinkEverywhere(developmentId, unit._id);
  await recomputeDevelopmentStats(developmentId);
};

// ---------------------------------------------------------------------------
// Bulk update
// ---------------------------------------------------------------------------

export const MAX_BULK_UNITS = 500;

export const bulkUpdateUnits = async (params: {
  developmentId: mongoose.Types.ObjectId;
  role: DevelopmentRole | undefined;
  actorId: Id;
  payload: unknown;
}): Promise<{ updated: number }> => {
  const { developmentId, role, actorId } = params;
  const body = (params.payload ?? {}) as Record<string, unknown>;
  const { unitIds, availability, visibility } = body;

  const touched: string[] = [];
  if (availability !== undefined) touched.push('availability');
  if (visibility !== undefined) touched.push('visibility');
  if (touched.length === 0) throw new ValidationError('Supply availability and/or visibility');
  assertAllowed(role, touched);

  if (!Array.isArray(unitIds) || unitIds.length === 0) {
    throw new ValidationError('unitIds must be a non-empty array');
  }
  if (unitIds.length > MAX_BULK_UNITS) {
    throw new ValidationError(`A bulk update is limited to ${MAX_BULK_UNITS} units`);
  }
  const ids = unitIds.map((raw) => {
    const id = toObjectId(raw);
    if (!id) throw new ValidationError('Every unitId must be a valid id');
    return id;
  });
  if (availability !== undefined && !isUnitAvailability(availability)) {
    throw new ValidationError(`availability must be one of: ${UNIT_AVAILABILITY_STATES.join(', ')}`);
  }
  if (visibility !== undefined && !isUnitVisibility(visibility)) {
    throw new ValidationError(`visibility must be one of: ${UNIT_VISIBILITIES.join(', ')}`);
  }

  const scope = { _id: { $in: ids }, developmentId, deletedAt: LIVE };
  // Remember which units were not yet available, to alert only on a real
  // transition (same semantics as the single-unit path).
  const becomingAvailable =
    availability === 'available'
      ? await DevelopmentUnit.find({ ...scope, availability: { $ne: 'available' } }).select('_id availability')
      : [];

  const $set: Record<string, unknown> = {};
  if (availability !== undefined) $set.availability = availability;
  if (visibility !== undefined) $set.visibility = visibility;
  const result = await DevelopmentUnit.updateMany(scope, { $set });

  await recordDevelopmentAudit({
    developmentId,
    action: 'unit.bulk_update',
    actorId,
    targetType: 'unit',
    metadata: {
      unitIds: ids.map(String),
      matched: result.matchedCount,
      modified: result.modifiedCount,
      ...$set,
    },
  });

  if (availability !== undefined) {
    const fresh = becomingAvailable.length
      ? await DevelopmentUnit.find({ _id: { $in: becomingAvailable.map((u) => u._id) } })
      : [];
    const prior = new Map(becomingAvailable.map((u) => [String(u._id), u.availability]));
    await applyAvailabilityTransition(
      developmentId,
      fresh.map((unit) => ({ prior: prior.get(String(unit._id)), unit }))
    );
  } else {
    await recomputeDevelopmentStats(developmentId);
  }
  return { updated: result.matchedCount };
};

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * One CSV cell. Text that a spreadsheet would treat as a formula (leading
 * = + - @, or a tab/CR that some apps strip first) is neutralised with a
 * leading apostrophe; then RFC 4180 quoting applies.
 */
export const csvCell = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let s = String(value);
  // Neutralise a formula at the start, after leading whitespace, or after a
  // ; or , that a locale's list separator would turn into a new cell.
  if (/^\s*[=+\-@]|^[\t\r]|[;,]\s*[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // Always quote text so separators inside it never split the cell.
  return `"${s.replace(/"/g, '""')}"`;
};

const CSV_HEADER = [
  'Unit number',
  'Building',
  'Floor',
  'Type',
  'Beds',
  'Baths',
  'Area (m2)',
  'Price',
  'Currency',
  'Availability',
  'Effective availability',
  'Visibility',
  'Linked listings',
];

const MAX_EXPORT_UNITS = 20000;

export const buildUnitsCsv = async (developmentId: mongoose.Types.ObjectId): Promise<string> => {
  const units = await DevelopmentUnit.find({ developmentId, deletedAt: LIVE })
    .collation(NUMERIC_COLLATION)
    .sort({ buildingId: 1, unitNumber: 1 })
    .limit(MAX_EXPORT_UNITS);
  const rows = await toDashboardUnits(developmentId, units);
  const lines = [CSV_HEADER.map(csvCell).join(',')];
  for (const u of rows) {
    lines.push(
      [
        u.unitNumber,
        u.buildingName,
        u.floorLabel,
        u.unitType,
        u.beds,
        u.baths,
        (u.netArea ?? u.totalArea ?? u.grossArea) as number | undefined,
        u.price,
        u.currency,
        u.availability,
        u.effectiveAvailability,
        u.visibility ?? 'public',
        u.linkedListings.map((l) => l.title || l.id).join('; '),
      ]
        .map(csvCell)
        .join(',')
    );
  }
  // BOM so spreadsheet apps read UTF-8 names (č, ć, ш) correctly.
  return `﻿${lines.join('\r\n')}\r\n`;
};

// ---------------------------------------------------------------------------
// Floorplan upload
// ---------------------------------------------------------------------------

export class StorageNotConfiguredError extends Error {
  readonly statusCode = 500;
  constructor() {
    super('Image upload service not configured');
    this.name = 'StorageNotConfiguredError';
  }
}

export const setUnitFloorplan = async (params: {
  development: IDevelopment;
  actorId: Id;
  unitId: unknown;
  file: Buffer;
}): Promise<DashboardUnitJSON> => {
  const { development, actorId } = params;
  const developmentId = development._id as mongoose.Types.ObjectId;
  const unit = await requireRefInDevelopment(DevelopmentUnit, params.unitId, developmentId, 'unitId');
  if (!isMediaStorageConfigured()) throw new StorageNotConfiguredError();

  const result = await uploadImage(params.file, {
    userId: String(actorId),
    developmentId: String(developmentId),
    developmentName: development.name,
    type: 'development-scene',
    maxWidth: 2400,
    maxHeight: 2400,
    preserveQuality: true,
  });

  const oldPublicId = unit.floorplan?.publicId;
  const updated = await DevelopmentUnit.findOneAndUpdate(
    { _id: unit._id, developmentId, deletedAt: LIVE },
    {
      $set: {
        floorplan: {
          url: result.url,
          publicId: result.publicId,
          width: result.width || undefined,
          height: result.height || undefined,
        },
      },
    },
    { new: true, runValidators: true }
  );
  if (!updated) throw new NotFoundError('unitId not found in this development');

  // Remove the replaced image only after the new one is saved.
  if (oldPublicId && oldPublicId !== result.publicId) {
    try {
      await deleteImage(oldPublicId);
    } catch (err) {
      log.warn('Could not delete old unit floorplan:', err);
    }
  }

  await recordDevelopmentAudit({
    developmentId,
    action: 'unit.update',
    actorId,
    targetType: 'unit',
    targetId: updated._id as mongoose.Types.ObjectId,
    metadata: { floorplan: true, changes: { floorplan: { from: unit.floorplan?.url ?? null, to: result.url } } },
  });
  return toDashboardUnit(developmentId, updated);
};

// ---------------------------------------------------------------------------
// Building / floor edits
// ---------------------------------------------------------------------------

const optString = (
  value: unknown,
  field: string,
  max: number,
  $set: Record<string, unknown>,
  $unset: Record<string, ''>
): void => {
  if (value === null) $unset[field] = '';
  else if (typeof value !== 'string') throw new ValidationError(`${field} must be a string or null`);
  else if (value.trim().length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  else if (value.trim()) $set[field] = value.trim();
  else $unset[field] = '';
};

const optCount = (
  value: unknown,
  field: string,
  $set: Record<string, unknown>,
  $unset: Record<string, ''>
): void => {
  if (value === null) $unset[field] = '';
  else if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative integer or null`);
  } else $set[field] = value;
};

const finiteNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ValidationError(`${field} must be a number`);
  return value;
};

const BUILDING_FIELDS = ['name', 'code', 'description', 'totalFloors', 'basementLevels', 'order'] as const;

export const MAX_UNIT_GALLERY = 30;

/**
 * Append uploaded images to a unit's gallery (max {@link MAX_UNIT_GALLERY}).
 * Uploads happen first; if saving fails the new images are removed again.
 */
export const addUnitGalleryImages = async (params: {
  development: IDevelopment;
  actorId: Id;
  unitId: unknown;
  files: Buffer[];
}): Promise<DashboardUnitJSON> => {
  const { development, actorId, files } = params;
  const developmentId = development._id as mongoose.Types.ObjectId;
  const unit = await requireRefInDevelopment(DevelopmentUnit, params.unitId, developmentId, 'unitId');
  if (files.length === 0) throw new ValidationError('No images uploaded');
  if ((unit.gallery?.length ?? 0) + files.length > MAX_UNIT_GALLERY) {
    throw new ValidationError(`A unit gallery holds at most ${MAX_UNIT_GALLERY} images`);
  }
  if (!isMediaStorageConfigured()) throw new StorageNotConfiguredError();

  const uploaded: Array<{ url: string; publicId: string; width?: number; height?: number }> = [];
  try {
    for (const file of files) {
      // Sequential on purpose: keeps memory and storage-API concurrency bounded.
      // eslint-disable-next-line no-await-in-loop
      const r = await uploadImage(file, {
        userId: String(actorId),
        developmentId: String(developmentId),
        developmentName: development.name,
        type: 'development-scene',
        maxWidth: 2400,
        maxHeight: 2400,
      });
      uploaded.push({ url: r.url, publicId: r.publicId, width: r.width || undefined, height: r.height || undefined });
    }
    // Guarded on the current size so two concurrent uploads can't exceed the cap.
    const updated = await DevelopmentUnit.findOneAndUpdate(
      {
        _id: unit._id,
        developmentId,
        deletedAt: LIVE,
        [`gallery.${MAX_UNIT_GALLERY - uploaded.length}`]: { $exists: false },
      },
      { $push: { gallery: { $each: uploaded } } },
      { new: true, runValidators: true }
    );
    if (!updated) throw new ValidationError(`A unit gallery holds at most ${MAX_UNIT_GALLERY} images`);
    await recordDevelopmentAudit({
      developmentId,
      action: 'unit.update',
      actorId,
      targetType: 'unit',
      targetId: updated._id as mongoose.Types.ObjectId,
      metadata: { gallery: { added: uploaded.length } },
    });
    return toDashboardUnit(developmentId, updated);
  } catch (err) {
    await Promise.all(
      uploaded.map((u) => deleteImage(u.publicId).catch((e) => log.warn('Could not roll back gallery image:', e)))
    );
    throw err;
  }
};

/** Remove one gallery image by its position (as listed in the unit's gallery). */
export const removeUnitGalleryImage = async (params: {
  development: IDevelopment;
  actorId: Id;
  unitId: unknown;
  index: unknown;
}): Promise<DashboardUnitJSON> => {
  const { development, actorId } = params;
  const developmentId = development._id as mongoose.Types.ObjectId;
  const unit = await requireRefInDevelopment(DevelopmentUnit, params.unitId, developmentId, 'unitId');
  const index = Number(params.index);
  const gallery = unit.gallery ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= gallery.length) {
    throw new NotFoundError('Gallery image not found');
  }
  const target = gallery[index];
  // Pull by URL (gallery entries have no _id); URLs are unique per upload.
  const updated = await DevelopmentUnit.findOneAndUpdate(
    { _id: unit._id, developmentId, deletedAt: LIVE },
    { $pull: { gallery: { url: target.url } } },
    { new: true }
  );
  if (!updated) throw new NotFoundError('unitId not found in this development');
  if (target.publicId) {
    try {
      await deleteImage(target.publicId);
    } catch (err) {
      log.warn('Could not delete gallery image:', err);
    }
  }
  await recordDevelopmentAudit({
    developmentId,
    action: 'unit.update',
    actorId,
    targetType: 'unit',
    targetId: updated._id as mongoose.Types.ObjectId,
    metadata: { gallery: { removed: 1 } },
  });
  return toDashboardUnit(developmentId, updated);
};

/** Remove a unit's floor plan image. */
export const removeUnitFloorplan = async (params: {
  development: IDevelopment;
  actorId: Id;
  unitId: unknown;
}): Promise<DashboardUnitJSON> => {
  const { development, actorId } = params;
  const developmentId = development._id as mongoose.Types.ObjectId;
  const unit = await requireRefInDevelopment(DevelopmentUnit, params.unitId, developmentId, 'unitId');
  if (!unit.floorplan) return toDashboardUnit(developmentId, unit);
  const old = unit.floorplan;
  const updated = await DevelopmentUnit.findOneAndUpdate(
    { _id: unit._id, developmentId, deletedAt: LIVE },
    { $unset: { floorplan: 1 } },
    { new: true }
  );
  if (!updated) throw new NotFoundError('unitId not found in this development');
  if (old.publicId) {
    try {
      await deleteImage(old.publicId);
    } catch (err) {
      log.warn('Could not delete unit floorplan:', err);
    }
  }
  await recordDevelopmentAudit({
    developmentId,
    action: 'unit.update',
    actorId,
    targetType: 'unit',
    targetId: updated._id as mongoose.Types.ObjectId,
    metadata: { floorplan: true, changes: { floorplan: { from: old.url, to: null } } },
  });
  return toDashboardUnit(developmentId, updated);
};

export const updateBuilding = async (params: {
  developmentId: mongoose.Types.ObjectId;
  actorId: Id;
  buildingId: unknown;
  payload: unknown;
}): Promise<IDevelopmentBuilding> => {
  const { developmentId, actorId } = params;
  const body = (params.payload ?? {}) as Record<string, unknown>;
  const touched = BUILDING_FIELDS.filter((f) => body[f] !== undefined);
  if (touched.length === 0) throw new ValidationError('No updatable fields supplied');
  const building = await requireRefInDevelopment(DevelopmentBuilding, params.buildingId, developmentId, 'buildingId');
  const before = building.toObject() as unknown as Record<string, unknown>;

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  for (const f of touched) {
    const v = body[f];
    if (f === 'name') {
      if (typeof v !== 'string' || !v.trim()) throw new ValidationError('building name is required');
      if (v.trim().length > 200) throw new ValidationError('name must be at most 200 characters');
      $set.name = v.trim();
    } else if (f === 'code') optString(v, f, 50, $set, $unset);
    else if (f === 'description') optString(v, f, 5000, $set, $unset);
    else if (f === 'totalFloors' || f === 'basementLevels') optCount(v, f, $set, $unset);
    else if (f === 'order') $set.order = finiteNumber(v, 'order');
  }
  const update: mongoose.UpdateQuery<IDevelopmentBuilding> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  const updated = await DevelopmentBuilding.findOneAndUpdate(
    { _id: building._id, developmentId, deletedAt: LIVE },
    update,
    { new: true, runValidators: true }
  );
  if (!updated) throw new NotFoundError('buildingId not found in this development');

  const changes = diffFields(before, updated.toObject() as unknown as Record<string, unknown>, touched);
  if (Object.keys(changes).length > 0) {
    await recordDevelopmentAudit({
      developmentId,
      action: 'building.update',
      actorId,
      targetType: 'building',
      targetId: updated._id as mongoose.Types.ObjectId,
      metadata: { changes },
    });
  }
  return updated;
};

const FLOOR_FIELDS = ['label', 'level', 'kind', 'order'] as const;

export const updateFloor = async (params: {
  developmentId: mongoose.Types.ObjectId;
  actorId: Id;
  floorId: unknown;
  payload: unknown;
}): Promise<IDevelopmentFloor> => {
  const { developmentId, actorId } = params;
  const body = (params.payload ?? {}) as Record<string, unknown>;
  const touched = FLOOR_FIELDS.filter((f) => body[f] !== undefined);
  if (touched.length === 0) throw new ValidationError('No updatable fields supplied');
  const floor = await requireRefInDevelopment(DevelopmentFloor, params.floorId, developmentId, 'floorId');
  const before = floor.toObject() as unknown as Record<string, unknown>;

  const $set: Record<string, unknown> = {};
  for (const f of touched) {
    const v = body[f];
    if (f === 'label') {
      if (typeof v !== 'string' || !v.trim()) throw new ValidationError('floor label is required');
      if (v.trim().length > 60) throw new ValidationError('label must be at most 60 characters');
      $set.label = v.trim();
    } else if (f === 'level') $set.level = finiteNumber(v, 'level');
    else if (f === 'order') $set.order = finiteNumber(v, 'order');
    else if (f === 'kind') {
      if (typeof v !== 'string' || !(FLOOR_KINDS as readonly string[]).includes(v)) {
        throw new ValidationError(`floor kind must be one of: ${FLOOR_KINDS.join(', ')}`);
      }
      $set.kind = v;
    }
  }
  const updated = await DevelopmentFloor.findOneAndUpdate(
    { _id: floor._id, developmentId, deletedAt: LIVE },
    { $set },
    { new: true, runValidators: true }
  );
  if (!updated) throw new NotFoundError('floorId not found in this development');

  const changes = diffFields(before, updated.toObject() as unknown as Record<string, unknown>, touched);
  if (Object.keys(changes).length > 0) {
    await recordDevelopmentAudit({
      developmentId,
      action: 'floor.update',
      actorId,
      targetType: 'floor',
      targetId: updated._id as mongoose.Types.ObjectId,
      metadata: { changes },
    });
  }
  return updated;
};
