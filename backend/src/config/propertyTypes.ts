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
  'parking',
  'land',
  'other',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const isPropertyType = (value: unknown): value is PropertyType =>
  typeof value === 'string' && (PROPERTY_TYPES as readonly string[]).includes(value);

/** Human-readable list for the message a rejected request gets back. */
export const PROPERTY_TYPES_LABEL = PROPERTY_TYPES.join(', ');

/**
 * The types a search asks for. Search filters carry one type, `any`, or
 * several joined by commas (`villa,apartment`); unknown words are dropped, and
 * an empty result means "every type". Saved searches made before the picker
 * allowed several types hold a single word, which reads the same way.
 */
export const parsePropertyTypeList = (value: unknown): PropertyType[] => {
  const words = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const types = words.map((word) => (typeof word === 'string' ? word.trim() : word)).filter(isPropertyType);
  return [...new Set(types)];
};
