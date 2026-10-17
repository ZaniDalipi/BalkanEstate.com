import mongoose from 'mongoose';
import DevelopmentBuilding, {
  IDevelopmentBuilding,
} from '../../models/DevelopmentBuilding';
import DevelopmentEntrance from '../../models/DevelopmentEntrance';
import DevelopmentFloor, { IDevelopmentFloor } from '../../models/DevelopmentFloor';
import DevelopmentUnit, { IDevelopmentUnit } from '../../models/DevelopmentUnit';
import { slugify } from '../media/mediaNaming';
import { recomputeDevelopmentStats, ValidationError } from './developmentService';
import {
  FLOOR_KINDS,
  UNIT_AVAILABILITY_STATES,
  isUnitAvailability,
  isUnitFeature,
  type FloorKind,
  type UnitAvailability,
} from '../../config/developments';

/** Keep only known feature flags, de-duplicated. */
const sanitizeFeatures = (input?: unknown): string[] => {
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
  if (!input.name?.trim()) throw new ValidationError('building name is required');
  const slug = await uniqueBuildingSlug(developmentId, input.name);
  const building = await DevelopmentBuilding.create({
    developmentId,
    name: input.name.trim(),
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

export const createEntrance = async (
  developmentId: Id,
  buildingId: Id,
  input: { name: string; code?: string; order?: number }
) => {
  if (!input.name?.trim()) throw new ValidationError('entrance name is required');
  return DevelopmentEntrance.create({
    developmentId,
    buildingId,
    name: input.name.trim(),
    code: input.code,
    order: input.order ?? 0,
  });
};

export const createFloor = async (
  developmentId: Id,
  buildingId: Id,
  input: {
    label: string;
    level: number;
    kind?: FloorKind;
    entranceId?: Id;
    order?: number;
  }
): Promise<IDevelopmentFloor> => {
  if (!input.label?.trim()) throw new ValidationError('floor label is required');
  if (typeof input.level !== 'number' || Number.isNaN(input.level)) {
    throw new ValidationError('floor level must be a number');
  }
  if (input.kind !== undefined && !(FLOOR_KINDS as readonly string[]).includes(input.kind)) {
    throw new ValidationError(`floor kind must be one of: ${FLOOR_KINDS.join(', ')}`);
  }
  return DevelopmentFloor.create({
    developmentId,
    buildingId,
    entranceId: input.entranceId,
    label: input.label.trim(),
    level: input.level,
    kind: input.kind ?? 'standard',
    order: input.order ?? 0,
  });
};

export interface CreateUnitInput {
  buildingId: Id;
  floorId: Id;
  entranceId?: Id;
  unitNumber: string;
  unitType: string;
  totalArea?: number;
  netArea?: number;
  grossArea?: number;
  beds?: number;
  baths?: number;
  balconies?: number;
  terraces?: number;
  orientation?: string;
  viewType?: string;
  features?: string[];
  price?: number;
  currency?: string;
  pricePerSqm?: number;
  availability?: UnitAvailability;
}

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
  if (!input.unitNumber?.trim()) throw new ValidationError('unitNumber is required');
  if (!input.unitType?.trim()) throw new ValidationError('unitType is required');
  if (
    input.availability !== undefined &&
    !isUnitAvailability(input.availability)
  ) {
    throw new ValidationError(
      `availability must be one of: ${UNIT_AVAILABILITY_STATES.join(', ')}`
    );
  }

  try {
    const unit = await DevelopmentUnit.create({
      developmentId,
      buildingId: input.buildingId,
      floorId: input.floorId,
      entranceId: input.entranceId,
      unitNumber: input.unitNumber.trim(),
      unitType: input.unitType.trim(),
      totalArea: input.totalArea,
      netArea: input.netArea,
      grossArea: input.grossArea,
      beds: input.beds,
      baths: input.baths,
      balconies: input.balconies,
      terraces: input.terraces,
      orientation: input.orientation,
      viewType: input.viewType,
      features: sanitizeFeatures(input.features),
      price: input.price,
      currency: input.currency,
      pricePerSqm: input.pricePerSqm,
      availability: input.availability ?? 'not_released',
    });
    await recomputeDevelopmentStats(developmentId);
    return unit;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ValidationError(
        `A unit numbered "${input.unitNumber}" already exists in this ${
          input.entranceId ? 'entrance' : 'building'
        }`
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
 * Change a unit's availability atomically. Returns the updated unit, or null if
 * it no longer exists. Recomputes the development's available-count cache.
 */
export const setUnitAvailability = async (
  developmentId: Id,
  unitId: Id,
  availability: UnitAvailability
): Promise<IDevelopmentUnit | null> => {
  if (!isUnitAvailability(availability)) {
    throw new ValidationError(
      `availability must be one of: ${UNIT_AVAILABILITY_STATES.join(', ')}`
    );
  }
  // Read the prior state so we only alert followers on a real transition
  // INTO 'available' (not when it was already available).
  const prior = await DevelopmentUnit.findOne({
    _id: unitId,
    developmentId,
    deletedAt: { $exists: false },
  }).select('availability');

  const unit = await DevelopmentUnit.findOneAndUpdate(
    { _id: unitId, developmentId, deletedAt: { $exists: false } },
    { $set: { availability } },
    { new: true }
  );
  if (unit) {
    await recomputeDevelopmentStats(developmentId);
    if (availability === 'available' && prior?.availability !== 'available') {
      // Fire-and-forget: alerting never blocks or fails the availability change.
      void notifyFollowersOnAvailable(String(developmentId), unit);
    }
  }
  return unit;
};

/**
 * Resolve the development's name/slug and notify matching followers that a unit
 * is now available. Isolated so the alert import stays lazy and errors here
 * cannot affect the availability write.
 */
const notifyFollowersOnAvailable = async (
  developmentId: string,
  unit: IDevelopmentUnit
): Promise<void> => {
  try {
    const [{ notifyFollowersUnitAvailable }, Development] = await Promise.all([
      import('./developmentAlertService'),
      import('../../models/Development').then((m) => m.default),
    ]);
    const dev = await Development.findById(developmentId).select('name slug').lean();
    if (!dev) return;
    await notifyFollowersUnitAvailable({
      developmentId,
      developmentName: dev.name,
      developmentSlug: dev.slug,
      unit,
    });
  } catch {
    /* already logged inside the alert service; never throw */
  }
};

/** True for a MongoDB duplicate-key (E11000) error, however it is wrapped. */
export const isDuplicateKeyError = (error: unknown): boolean => {
  const e = error as { code?: number; name?: string } | null;
  return !!e && (e.code === 11000 || e.name === 'MongoServerError');
};
