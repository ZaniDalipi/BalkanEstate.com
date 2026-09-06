import { PROPERTY_TYPES, type PropertyType } from './propertyTypes';

/**
 * What each kind of listing is described by — server-side rules.
 *
 * A mirror of `src/shared/property/typeAttributes.ts` rather than a shared
 * import, for the same reason the construction rules are mirrored: the
 * backend compiles from its own rootDir. The two copies guard different ends
 * of the same contract — the client's decides what a *form* shows and
 * submits, this one is the last word on what is *stored*, and so also covers
 * the importer and any other API client.
 *
 * The rule both copies state: a listing carries only the attributes its type
 * has. A parking space has no bedrooms, and after this runs it has no
 * bedrooms in the database either — not a zero, not a stale value from
 * before the seller changed the type, but no field at all.
 */

export const TYPE_ATTRIBUTES = [
  'beds',
  'baths',
  'livingRooms',
  'kitchens',
  'diningRooms',
  'toilets',
  'storageRooms',
  'offices',
  'openPlanArea',
  'parking',
  'parkingType',
  'floorNumber',
  'totalFloors',
] as const;

export type TypeAttribute = (typeof TYPE_ATTRIBUTES)[number];

export const PARKING_TYPES = ['garage', 'underground', 'covered', 'outdoor'] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

export const isParkingType = (value: unknown): value is ParkingType =>
  typeof value === 'string' && (PARKING_TYPES as readonly string[]).includes(value);

/** Nothing here is a count of rooms or spaces beyond this. */
export const MAX_ATTRIBUTE_COUNT = 999;

/**
 * Attributes that measure an area rather than count things.
 *
 * A count has to be whole — there is no half an office — but an area does
 * not: an open-plan floor really can be 102.5 m². Holding both to the same
 * "whole number" rule rejected an honest measurement, and mirrors the
 * client's `MEASURED_ATTRIBUTES`.
 */
const MEASURED_ATTRIBUTES = new Set<string>(['openPlanArea']);

const RESIDENTIAL_ATTRIBUTES: readonly TypeAttribute[] = [
  'beds', 'baths', 'livingRooms', 'kitchens', 'diningRooms',
  'toilets', 'storageRooms', 'offices', 'totalFloors',
];

const ATTRIBUTES_BY_TYPE: Record<PropertyType, readonly TypeAttribute[]> = {
  house: RESIDENTIAL_ATTRIBUTES,
  apartment: [...RESIDENTIAL_ATTRIBUTES, 'floorNumber'],
  villa: RESIDENTIAL_ATTRIBUTES,
  'luxury-villa': RESIDENTIAL_ATTRIBUTES,
  commercial: ['offices', 'openPlanArea', 'kitchens', 'toilets', 'storageRooms', 'floorNumber', 'totalFloors'],
  parking: ['parking', 'parkingType', 'floorNumber'],
  land: [],
  // The escape hatch keeps everything: we do not know what it is, so we do
  // not get to decide which of its fields are meaningless.
  other: TYPE_ATTRIBUTES,
};

/** Anything unrecognised is treated as 'other', which hides nothing. */
export const attributesForType = (type: unknown): readonly TypeAttribute[] =>
  ATTRIBUTES_BY_TYPE[type as PropertyType] ?? ATTRIBUTES_BY_TYPE.other;

export interface AttributeNormalization {
  ok: boolean;
  /** The attributes to store, with everything the type does not have removed. */
  fields: Record<string, unknown>;
  /** Names that were dropped — logged, never shown to the client as an error. */
  dropped: string[];
  error?: string;
}

/**
 * Filter and check a payload's type-dependent attributes.
 *
 * Dropping and rejecting are deliberately different outcomes. An attribute
 * the type does not have is dropped and reported in `dropped`, because a
 * client sending a field this type ignores is sloppy, not hostile, and
 * failing the write would lose a legitimate listing over a stray key. A value
 * that is not a count — negative, fractional, or absurd — is rejected,
 * because storing it would publish "-3 offices".
 */
export function normalizeTypeAttributes(
  propertyType: unknown,
  input: Record<string, unknown>,
): AttributeNormalization {
  const allowed = new Set<string>(attributesForType(propertyType));
  const fields: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (!(TYPE_ATTRIBUTES as readonly string[]).includes(key)) continue;

    if (!allowed.has(key)) {
      // Only report a value actually being discarded; an explicit zero or a
      // missing key is the client agreeing with us, not a mistake worth
      // logging on every write.
      if (value !== undefined && value !== null && value !== '' && value !== 0) dropped.push(key);
      continue;
    }

    if (value === undefined || value === null || value === '') continue;

    if (key === 'parkingType') {
      if (!isParkingType(value)) {
        return { ok: false, fields: {}, dropped, error: `parkingType must be one of: ${PARKING_TYPES.join(', ')}` };
      }
      fields[key] = value;
      continue;
    }

    const measured = typeof value === 'string' ? Number(value.trim()) : value;
    const mustBeWhole = !MEASURED_ATTRIBUTES.has(key);
    if (
      typeof measured !== 'number'
      || !Number.isFinite(measured)
      || (mustBeWhole && !Number.isInteger(measured))
      || measured < 0
      || measured > MAX_ATTRIBUTE_COUNT
    ) {
      return {
        ok: false,
        fields: {},
        dropped,
        error: mustBeWhole
          ? `${key} must be a whole number between 0 and ${MAX_ATTRIBUTE_COUNT}`
          : `${key} must be a number between 0 and ${MAX_ATTRIBUTE_COUNT}`,
      };
    }
    fields[key] = measured;
  }

  return { ok: true, fields, dropped };
}

/** Every type, for exhaustive tests. */
export const ALL_PROPERTY_TYPES: readonly PropertyType[] = PROPERTY_TYPES;
