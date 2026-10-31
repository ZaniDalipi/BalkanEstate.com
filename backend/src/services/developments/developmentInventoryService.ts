import mongoose from 'mongoose';
import { assertUnitValue } from './unitRules';
import DevelopmentBuilding, {
  IDevelopmentBuilding,
} from '../../models/DevelopmentBuilding';
import DevelopmentEntrance from '../../models/DevelopmentEntrance';
import DevelopmentFloor, { IDevelopmentFloor } from '../../models/DevelopmentFloor';
import DevelopmentUnit, { IDevelopmentUnit } from '../../models/DevelopmentUnit';
import { slugify } from '../media/mediaNaming';
import { recomputeDevelopmentStats, ValidationError } from './developmentService';
import { assertBuildingCapacity } from './billing/residenceBillingService';
import { requireRefInDevelopment } from './developmentRefs';
import {
  FLOOR_KINDS,
  UNIT_AVAILABILITY_STATES,
  UNIT_VISIBILITIES,
  PRICE_VISIBILITIES,
  UNIT_CURRENCY,
  isUnitAvailability,
  isUnitFeature,
  isUnitVisibility,
  isPriceVisibility,
  type FloorKind,
  type UnitAvailability,
  type UnitVisibility,
  type PriceVisibility,
} from '../../config/developments';

/** A trimmed string, or '' for anything that isn't a string (so bad input is a 400, not a crash). */
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');


/** Keep only known feature flags, de-duplicated. */
export const sanitizeFeatures = (input?: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter(isUnitFeature)));
};

type Id = mongoose.Types.ObjectId | string;

/** Unique building slug within one development (among live buildings). */
const uniqueBuildingSlug = async (
  developmentId: Id,
  name: string
): Promise<string> => {
  const base = slugify(name, 60) || 'building';
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (
    await DevelopmentBuilding.exists({
      developmentId,
      slug,
      deletedAt: { $exists: false },
    })
  ) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
};

export const createBuilding = async (
  developmentId: Id,
  input: {
    name: string;
    code?: string;
    description?: string;
    totalFloors?: number;
    basementLevels?: number;
    lat?: number;
    lng?: number;
    order?: number;
  }
): Promise<IDevelopmentBuilding> => {
  if (!text(input.name)) throw new ValidationError('building name is required', { code: 'FIELD_REQUIRED', field: 'name' });
  // Residence Pass: every building past the plan's limit has to be unlocked.
  await assertBuildingCapacity(developmentId, 1);
  const slug = await uniqueBuildingSlug(developmentId, input.name);
  const building = await DevelopmentBuilding.create({
    developmentId,
    name: text(input.name),
    code: input.code,
    slug,
    description: input.description,
    totalFloors: input.totalFloors,
    basementLevels: input.basementLevels,
    lat: input.lat,
    lng: input.lng,
    order: input.order ?? 0,
  });
  await recomputeDevelopmentStats(developmentId);
  return building;
};

export const createFloor = async (
  developmentId: Id,
  buildingId: unknown,
  input: {
    label: string;
    level: number;
    kind?: FloorKind;
    entranceId?: unknown;
    order?: number;
  }
): Promise<IDevelopmentFloor> => {
  if (!text(input.label)) throw new ValidationError('floor label is required', { code: 'FIELD_REQUIRED', field: 'label' });
  if (typeof input.level !== 'number' || !Number.isFinite(input.level)) {
    throw new ValidationError('floor level must be a number', { code: 'FIELD_NOT_NUMBER', field: 'level' });
  }
  if (input.kind !== undefined && !(FLOOR_KINDS as readonly string[]).includes(input.kind)) {
    throw new ValidationError(`floor kind must be one of: ${FLOOR_KINDS.join(', ')}`, { code: 'FIELD_INVALID', field: 'kind' });
  }
  // The client speaks encoded ids; resolve them and prove the building (and
  // entrance) live in THIS development before writing anything.
  const building = await requireRefInDevelopment(DevelopmentBuilding, buildingId, developmentId, 'buildingId');
  let entranceId: mongoose.Types.ObjectId | undefined;
  if (input.entranceId !== undefined && input.entranceId !== null && input.entranceId !== '') {
    const entrance = await requireRefInDevelopment(DevelopmentEntrance, input.entranceId, developmentId, 'entranceId');
    if (String(entrance.buildingId) !== String(building._id)) {
      throw new ValidationError('entranceId must belong to the building', { code: 'ENTRANCE_NOT_IN_BUILDING', field: 'entranceId' });
    }
    entranceId = entrance._id as mongoose.Types.ObjectId;
  }
  return DevelopmentFloor.create({
    developmentId,
    buildingId: building._id,
    entranceId,
    label: text(input.label),
    level: input.level,
    kind: input.kind ?? 'standard',
    order: input.order ?? 0,
  });
};

export interface CreateUnitInput {
  buildingId: unknown;
  floorId: unknown;
  entranceId?: unknown;
  unitNumber: string;
  unitType: string;
  totalArea?: number;
  netArea?: number;
  grossArea?: number;
  beds?: number;
  baths?: number;
  livingRooms?: number;
  externalArea?: number;
  terraceArea?: number;
  balconies?: number;
  terraces?: number;
  orientation?: string;
  viewType?: string;
  description?: string;
  features?: string[];
  price?: number;
  currency?: string;
  pricePerSqm?: number;
  availability?: UnitAvailability;
  visibility?: UnitVisibility;
  priceVisibility?: PriceVisibility;
}

/**
 * Resolve a unit's building / floor / entrance placement from client ids and
 * prove the chain floor ∈ building ∈ development (and entrance ∈ building).
 */
export const resolveUnitPlacement = async (
  developmentId: Id,
  raw: { buildingId: unknown; floorId: unknown; entranceId?: unknown }
): Promise<{
  building: IDevelopmentBuilding;
  floor: IDevelopmentFloor;
  entranceId?: mongoose.Types.ObjectId;
}> => {
  const building = await requireRefInDevelopment(DevelopmentBuilding, raw.buildingId, developmentId, 'buildingId');
  const floor = await requireRefInDevelopment(DevelopmentFloor, raw.floorId, developmentId, 'floorId');
  if (String(floor.buildingId) !== String(building._id)) {
    throw new ValidationError('floorId must belong to the building', { code: 'FLOOR_NOT_IN_BUILDING', field: 'floorId' });
  }
  let entranceId: mongoose.Types.ObjectId | undefined;
  if (raw.entranceId !== undefined && raw.entranceId !== null && raw.entranceId !== '') {
    const entrance = await requireRefInDevelopment(DevelopmentEntrance, raw.entranceId, developmentId, 'entranceId');
    if (String(entrance.buildingId) !== String(building._id)) {
      throw new ValidationError('entranceId must belong to the building', { code: 'ENTRANCE_NOT_IN_BUILDING', field: 'entranceId' });
    }
    entranceId = entrance._id as mongoose.Types.ObjectId;
  }
  return { building, floor, entranceId };
};

/**
 * Create a canonical physical unit. Uniqueness of the unit number (per entrance
 * when present, else per building) is enforced by the model's partial indexes;
 * a duplicate surfaces as a ValidationError here so controllers return 400/409
 * rather than a raw driver error.
 */
export const createUnit = async (
  developmentId: Id,
  input: CreateUnitInput
): Promise<IDevelopmentUnit> => {
  if (!text(input.unitNumber)) throw new ValidationError('unitNumber is required', { code: 'FIELD_REQUIRED', field: 'unitNumber' });
  if (!text(input.unitType)) throw new ValidationError('unitType is required', { code: 'FIELD_REQUIRED', field: 'unitType' });
  if (
    input.availability !== undefined &&
    !isUnitAvailability(input.availability)
  ) {
    throw new ValidationError(`availability must be one of: ${UNIT_AVAILABILITY_STATES.join(', ')}`, {
      code: 'FIELD_INVALID',
      field: 'availability',
    });
  }
  if (input.visibility !== undefined && !isUnitVisibility(input.visibility)) {
    throw new ValidationError(`visibility must be one of: ${UNIT_VISIBILITIES.join(', ')}`, { code: 'FIELD_INVALID', field: 'visibility' });
  }
  if (input.priceVisibility !== undefined && !isPriceVisibility(input.priceVisibility)) {
    throw new ValidationError(`priceVisibility must be one of: ${PRICE_VISIBILITIES.join(', ')}`, {
      code: 'FIELD_INVALID',
      field: 'priceVisibility',
    });
  }
  for (const field of ['orientation', 'viewType', 'currency'] as const) {
    const v = text(input[field]);
    if (v) assertUnitValue(field, v);
  }
  const placement = await resolveUnitPlacement(developmentId, input);

  try {
    const unit = await DevelopmentUnit.create({
      developmentId,
      buildingId: placement.building._id,
      floorId: placement.floor._id,
      entranceId: placement.entranceId,
      unitNumber: text(input.unitNumber),
      unitType: text(input.unitType),
      totalArea: input.totalArea,
      netArea: input.netArea,
      grossArea: input.grossArea,
      beds: input.beds,
      baths: input.baths,
      livingRooms: input.livingRooms,
      externalArea: input.externalArea,
      terraceArea: input.terraceArea,
      balconies: input.balconies,
      terraces: input.terraces,
      orientation: text(input.orientation) || undefined,
      viewType: text(input.viewType) || undefined,
      description: input.description,
      features: sanitizeFeatures(input.features),
      price: input.price,
      currency: UNIT_CURRENCY,
      pricePerSqm: input.pricePerSqm,
      availability: input.availability ?? 'not_released',
      visibility: input.visibility ?? 'public',
      priceVisibility: input.priceVisibility ?? 'public',
    });
    await recomputeDevelopmentStats(developmentId);
    return unit;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ValidationError(
        `A unit numbered "${input.unitNumber}" already exists in this ${placement.entranceId ? 'entrance' : 'building'}`,
        { code: 'UNIT_NUMBER_TAKEN', field: 'unitNumber', params: { number: text(input.unitNumber) } }
      );
    }
    throw error;
  }
};

export const listUnits = async (
  developmentId: Id,
  opts: { buildingId?: Id; floorId?: Id; availability?: string; limit?: number; skip?: number } = {}
): Promise<{ items: IDevelopmentUnit[]; total: number }> => {
  const query: Record<string, unknown> = {
    developmentId,
    deletedAt: { $exists: false },
  };
  if (opts.buildingId) query.buildingId = opts.buildingId;
  if (opts.floorId) query.floorId = opts.floorId;
  if (opts.availability) query.availability = opts.availability;

  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const skip = Math.max(opts.skip ?? 0, 0);

  const [items, total] = await Promise.all([
    DevelopmentUnit.find(query).sort({ buildingId: 1, unitNumber: 1 }).skip(skip).limit(limit),
    DevelopmentUnit.countDocuments(query),
  ]);
  return { items, total };
};

/**
 * The one place an availability transition's side effects live: recompute the
 * development's available-count cache and alert followers on a real
 * transition INTO 'available'. Every write path that changes availability —
 * the dedicated endpoint, the general unit edit and bulk edits — calls this,
 * so the semantics cannot drift between them.
 */
export const applyAvailabilityTransition = async (
  developmentId: Id,
  transitions: ReadonlyArray<{ prior: UnitAvailability | undefined; unit: IDevelopmentUnit }>
): Promise<void> => {
  await recomputeDevelopmentStats(developmentId);
  const nowAvailable = transitions
    .filter((t) => t.unit.availability === 'available' && t.prior !== 'available')
    .map((t) => t.unit);
  if (nowAvailable.length > 0) {
    // Fire-and-forget: alerting never blocks or fails the availability change.
    void notifyFollowersOnAvailable(String(developmentId), nowAvailable);
  }
};

/**
 * Change a unit's availability atomically. Returns the updated unit, or null if
 * it no longer exists. Recomputes the development's available-count cache.
 */
export const setUnitAvailability = async (
  developmentId: Id,
  unitId: Id,
  availability: UnitAvailability
): Promise<IDevelopmentUnit | null> => {
  if (!isUnitAvailability(availability)) {
    throw new ValidationError(`availability must be one of: ${UNIT_AVAILABILITY_STATES.join(', ')}`, {
      code: 'FIELD_INVALID',
      field: 'availability',
    });
  }
  // The pre-update document (new: false) tells us the prior state, so we only
  // alert followers on a real transition INTO 'available'.
  const prior = await DevelopmentUnit.findOneAndUpdate(
    { _id: unitId, developmentId, deletedAt: { $exists: false } },
    { $set: { availability } },
    { new: false }
  );
  if (!prior) return null;
  const unit = await DevelopmentUnit.findById(prior._id);
  if (!unit) return null;
  await applyAvailabilityTransition(developmentId, [{ prior: prior.availability, unit }]);
  return unit;
};

/**
 * Resolve the development's name/slug once and notify matching followers that
 * units are now available. Isolated so the alert import stays lazy and errors
 * here cannot affect the availability write.
 */
const notifyFollowersOnAvailable = async (
  developmentId: string,
  units: IDevelopmentUnit[]
): Promise<void> => {
  try {
    const [{ notifyFollowersUnitAvailable }, Development] = await Promise.all([
      import('./developmentAlertService'),
      import('../../models/Development').then((m) => m.default),
    ]);
    const dev = await Development.findById(developmentId).select('name slug status deletedAt visibleUntil').lean();
    // Followers only hear about residences buyers can actually see (published,
    // and within its trial, pass or plan).
    const { isPubliclyVisible } = await import('./billing/publicResidenceFilter');
    if (!dev || !isPubliclyVisible(dev)) return;
    for (const unit of units) {
      // Hidden units do not exist for buyers — never announce them.
      if (unit.visibility === 'hidden') continue;
      // eslint-disable-next-line no-await-in-loop
      await notifyFollowersUnitAvailable({
        developmentId,
        developmentName: dev.name,
        developmentSlug: dev.slug,
        unit,
      });
    }
  } catch {
    /* already logged inside the alert service; never throw */
  }
};

/** True for a MongoDB duplicate-key (E11000) error, however it is wrapped. */
/**
 * A unique-index violation. Only code 11000 — any other MongoServerError (a
 * timeout, a write conflict) is a real failure, not "already exists".
 */
export const isDuplicateKeyError = (error: unknown): boolean => {
  const e = error as { code?: number } | null;
  return !!e && e.code === 11000;
};
