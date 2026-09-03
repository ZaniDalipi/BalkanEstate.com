/**
 * The property types a listing may be filed under.
 *
 * This is the backend's single source of truth: the Mongoose enum on
 * `Property.propertyType`, and every controller that validates a client-supplied
 * type, read from here. It mirrors `PROPERTY_TYPES` in
 * `src/shared/types/property.types.ts` on the frontend — the two lists are the
 * same contract seen from either side of the API.
 */
export const PROPERTY_TYPES = [
  'house',
  'apartment',
  'villa',
  'luxury-villa',
  'commercial',
  'office',
  'warehouse',
  'hotel',
  'parking',
  'garage',
  'land',
  'other',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const isPropertyType = (value: unknown): value is PropertyType =>
  typeof value === 'string' && (PROPERTY_TYPES as readonly string[]).includes(value);

/** Human-readable list for the message a rejected request gets back. */
export const PROPERTY_TYPES_LABEL = PROPERTY_TYPES.join(', ');
