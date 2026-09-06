import { PROPERTY_TYPES, type PropertyType } from '@/shared/types/property.types';

/**
 * What each kind of listing is actually described by.
 *
 * A parking space has no bedrooms and a plot of land has no bathrooms, yet
 * every listing carried the same fields, so a parking space was advertised as
 * "0 Beds · 0 Baths" and its form asked how many living rooms it had. The
 * fix is not another `propertyType === 'land'` check next to the last one —
 * those had already spread across the form, the cards and the markers, each
 * one free to disagree. It is this table: one statement per type of what it
 * has, read by everything.
 *
 * Three things come out of it:
 *
 *   - **The form** asks only for attributes the type has.
 *   - **The search** shows only those, under the type's own name and colour.
 *   - **The write path** drops the rest, on both sides of the API, so the
 *     database never stores a bedroom count for a garage. That is what makes
 *     this the single source of truth rather than a display convention:
 *     nothing downstream has to remember which fields to ignore.
 *
 * Adding a type means adding a row here; nothing else has to be found and
 * updated, and a missing row is a type error rather than a screen that
 * quietly asks for the wrong things.
 */

/**
 * Attributes that only some types carry.
 *
 * These are the names used on `Property` — the API and the database speak the
 * same words — so the write path can filter a payload by this list directly.
 * Area, price, address and the rest belong to every listing and are not here.
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

/** How a parking space is arranged. */
export const PARKING_TYPES = ['garage', 'underground', 'covered', 'outdoor'] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];

export const isParkingType = (value: unknown): value is ParkingType =>
  typeof value === 'string' && (PARKING_TYPES as readonly string[]).includes(value);

/** A stat chip on a search card, in the order it is shown. */
export type StatKey = 'beds' | 'baths' | 'sqft' | 'parking' | 'offices' | 'openPlanArea';

interface TypeProfile {
  /** Attributes this type may carry. Everything else is dropped on write. */
  attributes: readonly TypeAttribute[];
  /**
   * What a search card leads with. Area is on every type — it is the one
   * measure every listing has — and the rest is what tells this type apart.
   */
  stats: readonly StatKey[];
  /**
   * Marker and badge colour. Lives here rather than in the map so a card, a
   * badge and a pin cannot show one listing in three colours.
   */
  color: string;
}

const RESIDENTIAL_ATTRIBUTES = [
  'beds', 'baths', 'livingRooms', 'kitchens', 'diningRooms',
  'toilets', 'storageRooms', 'offices', 'totalFloors',
] as const satisfies readonly TypeAttribute[];

const RESIDENTIAL_STATS = ['beds', 'baths', 'sqft'] as const satisfies readonly StatKey[];

const PROFILES: Record<PropertyType, TypeProfile> = {
  house: { attributes: RESIDENTIAL_ATTRIBUTES, stats: RESIDENTIAL_STATS, color: '#0252CD' },
  apartment: {
    attributes: [...RESIDENTIAL_ATTRIBUTES, 'floorNumber'],
    stats: RESIDENTIAL_STATS,
    color: '#28a745',
  },
  villa: { attributes: RESIDENTIAL_ATTRIBUTES, stats: RESIDENTIAL_STATS, color: '#6f42c1' },
  'luxury-villa': {
    attributes: RESIDENTIAL_ATTRIBUTES,
    stats: RESIDENTIAL_STATS,
    color: '#FFA500', // Amber/gold — exclusive to the Luxury Villas tab
  },
  // Business premises are described by working space, not by rooms to sleep
  // in: how many offices, how much of it is open plan, whether there is a
  // kitchen, and how many WCs.
  commercial: {
    attributes: ['offices', 'openPlanArea', 'kitchens', 'toilets', 'storageRooms', 'floorNumber', 'totalFloors'],
    stats: ['sqft', 'offices', 'openPlanArea'],
    color: '#E11D48', // Rose — business premises
  },
  // A parking space is an area, a number of spaces and how it is arranged.
  // Its condition comes from the same enum every other type uses.
  parking: {
    attributes: ['parking', 'parkingType', 'floorNumber'],
    stats: ['sqft', 'parking'],
    color: '#475569', // Slate — reads like parking signage
  },
  land: { attributes: [], stats: ['sqft'], color: '#8B4513' },
  // 'other' is the escape hatch for a listing that fits nothing above, so it
  // keeps every attribute rather than guessing which ones do not apply.
  other: {
    attributes: TYPE_ATTRIBUTES,
    stats: RESIDENTIAL_STATS,
    color: '#0D9488', // Teal — distinct from every other type
  },
};

/** Anything unrecognised is treated as 'other', which hides nothing. */
const profileFor = (type: unknown): TypeProfile =>
  PROFILES[type as PropertyType] ?? PROFILES.other;

/** True when a listing of this type is described by `attribute`. */
export const typeHasAttribute = (type: unknown, attribute: TypeAttribute): boolean =>
  profileFor(type).attributes.includes(attribute);

/** Every attribute this type carries, in declaration order. */
export const attributesForType = (type: unknown): readonly TypeAttribute[] =>
  profileFor(type).attributes;

/** The stat chips a search card shows for this type, in order. */
export const statsForType = (type: unknown): readonly StatKey[] => profileFor(type).stats;

/** The colour this type is drawn in, everywhere it is drawn. */
export const colorForType = (type: unknown): string => profileFor(type).color;

/**
 * Drop attributes a type does not have.
 *
 * The write path's half of the contract: a payload that names bedrooms on a
 * parking space loses them here rather than being rejected, because a client
 * sending a field the type ignores is sloppy, not hostile, and failing the
 * whole listing over it would be worse than silently filing it correctly.
 * Values that are genuinely wrong — a negative count, a bad parking type —
 * are a different matter and are rejected by `validateTypeAttributes`.
 */
export const stripAttributesForType = <T extends Record<string, unknown>>(
  type: unknown,
  input: T,
): Partial<T> => {
  const kept = new Set<string>(profileFor(type).attributes);
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(input)) {
    // Only the type-dependent names are filtered; everything else — price,
    // area, address — belongs to every listing and passes through.
    if (!(TYPE_ATTRIBUTES as readonly string[]).includes(key) || kept.has(key)) {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
};

/**
 * Carry the type-dependent attributes across a transform boundary.
 *
 * The API and the database use the same names as `Property`, so a transform
 * has nothing to translate here — it only has to not forget anything. Naming
 * each attribute by hand is what went wrong before: `openPlanArea` and
 * `parkingType` were added to the type table and to the form, and then
 * silently dropped by every transform and by the server's write allow-list,
 * so a shop's office count and open-plan area were collected from the seller
 * and thrown away on the way to the database. Reading the table itself means
 * the next attribute cannot go missing the same way.
 *
 * Absent keys stay absent — a type that does not carry an attribute must not
 * gain an explicit `undefined`, which would read as "clear this field".
 */
export const copyTypeAttributes = (source: Record<string, unknown> | null | undefined) => {
  const copied: Record<string, unknown> = {};
  if (!source) return copied;

  for (const attribute of TYPE_ATTRIBUTES) {
    if (source[attribute] !== undefined) copied[attribute] = source[attribute];
  }

  return copied;
};

/** Type-checked list of every type, for exhaustive tests and pickers. */
export const ALL_PROPERTY_TYPES: readonly PropertyType[] = PROPERTY_TYPES;
