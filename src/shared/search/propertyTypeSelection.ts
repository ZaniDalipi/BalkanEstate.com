import {
  PROPERTY_TYPES,
  isPropertyType,
  type PropertyType,
  type PropertyTypeSelection,
} from '@/shared/types/property.types';

/**
 * The types a property-type filter asks for, in the app's own order. Reads
 * `any`, one type, or several joined by commas; unknown words are dropped, and
 * an empty list means "every type".
 */
export const parsePropertyTypes = (value: unknown): PropertyType[] => {
  if (typeof value !== 'string') return [];
  const wanted = new Set(value.split(',').map((word) => word.trim()).filter(isPropertyType));
  return PROPERTY_TYPES.filter((type) => wanted.has(type));
};

/** The filter value for these types: `any` when there are none. */
export const toPropertyTypeSelection = (types: readonly PropertyType[]): PropertyTypeSelection => {
  const ordered = PROPERTY_TYPES.filter((type) => types.includes(type));
  if (ordered.length === 0) return 'any';
  if (ordered.length === 1) return ordered[0];
  const [first, ...rest] = ordered;
  return `${first},${rest.join(',')}`;
};

/** Normalises a value from a link, a saved search or stored filters. */
export const readPropertyTypeSelection = (value: unknown): PropertyTypeSelection =>
  toPropertyTypeSelection(parsePropertyTypes(value));

/** Adds the type when it is missing, takes it out when it is there. */
export const togglePropertyType = (
  selection: PropertyTypeSelection,
  type: PropertyType,
): PropertyTypeSelection => {
  const current = parsePropertyTypes(selection);
  return toPropertyTypeSelection(
    current.includes(type) ? current.filter((each) => each !== type) : [...current, type],
  );
};

/** The one type asked for, or `undefined` for "every type" or several. */
export const singlePropertyType = (selection: unknown): PropertyType | undefined => {
  const types = parsePropertyTypes(selection);
  return types.length === 1 ? types[0] : undefined;
};
