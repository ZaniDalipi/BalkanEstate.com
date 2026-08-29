/**
 * Single source of truth for the property-type taxonomy.
 *
 * The list is tuned for Balkan real estate rather than a generic/US one: a
 * studio (garsonjera/garsonjere) and a whole-building listing are distinct,
 * everyday categories on regional portals, and agricultural land is priced and
 * searched separately from building plots.
 *
 * `value` is what is persisted on the Property document and sent to the API, so
 * these strings must stay in sync with the Mongoose enum in
 * backend/src/models/Property.ts. `labelKey` resolves against the `property`
 * i18n namespace (property:types.*).
 */

export const PROPERTY_TYPES = [
  { value: 'apartment',    labelKey: 'property:types.apartment',    group: 'residential' },
  { value: 'studio',       labelKey: 'property:types.studio',       group: 'residential' },
  { value: 'penthouse',    labelKey: 'property:types.penthouse',    group: 'residential' },
  { value: 'house',        labelKey: 'property:types.house',        group: 'residential' },
  { value: 'villa',        labelKey: 'property:types.villa',        group: 'residential' },
  { value: 'luxury-villa', labelKey: 'property:types.luxury-villa', group: 'residential' },
  { value: 'building',     labelKey: 'property:types.building',     group: 'commercial'  },
  { value: 'commercial',   labelKey: 'property:types.commercial',   group: 'commercial'  },
  { value: 'garage',       labelKey: 'property:types.garage',       group: 'commercial'  },
  { value: 'land',         labelKey: 'property:types.land',         group: 'land'        },
  { value: 'agricultural', labelKey: 'property:types.agricultural', group: 'land'        },
  { value: 'other',        labelKey: 'property:types.other',        group: 'other'       },
] as const;

export type PropertyTypeValue = typeof PROPERTY_TYPES[number]['value'];

export type PropertyTypeGroup = typeof PROPERTY_TYPES[number]['group'];

export const PROPERTY_TYPE_VALUES: readonly PropertyTypeValue[] =
  PROPERTY_TYPES.map(t => t.value);

/** Group ordering used when the picker renders section headings. */
export const PROPERTY_TYPE_GROUPS: readonly PropertyTypeGroup[] = [
  'residential',
  'commercial',
  'land',
  'other',
];

/**
 * A unit inside a larger block: which floor it sits on is meaningful, as is the
 * building's total floor count and whether there is a lift.
 */
export const UNIT_IN_BLOCK_TYPES: readonly PropertyTypeValue[] = [
  'apartment',
  'studio',
  'penthouse',
];

/** A whole structure: only its own floor count is meaningful. */
export const STANDALONE_BUILDING_TYPES: readonly PropertyTypeValue[] = [
  'house',
  'villa',
  'luxury-villa',
  'building',
];

/** Plots rather than structures — no floors, rooms or lift. */
export const LAND_TYPES: readonly PropertyTypeValue[] = ['land', 'agricultural'];

export const isPropertyTypeValue = (value: unknown): value is PropertyTypeValue =>
  typeof value === 'string' && (PROPERTY_TYPE_VALUES as readonly string[]).includes(value);

/**
 * Normalises whatever a caller has into a clean list of property types.
 *
 * Accepts the shapes that exist in the wild: the new array form, the legacy
 * single-value form (including the sentinel `'any'`), and a comma-separated
 * query-string value. Unknown values are dropped rather than passed through, so
 * a stale saved search can never widen or break a query. An empty result means
 * "any type".
 */
export const normalizePropertyTypes = (
  value: unknown,
): PropertyTypeValue[] => {
  if (value == null) return [];

  const raw: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [value];

  const seen = new Set<PropertyTypeValue>();
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    // 'any'/'all' are the legacy sentinels for "no type filter".
    if (!trimmed || trimmed === 'any' || trimmed === 'all') continue;
    if (isPropertyTypeValue(trimmed)) seen.add(trimmed);
  }
  return [...seen];
};
