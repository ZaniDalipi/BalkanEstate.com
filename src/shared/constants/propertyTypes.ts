import { PROPERTY_TYPES, type PropertyType } from '@/shared/types/property.types';

/**
 * Presentation data for the property-type pickers.
 *
 * Every picker in the app — the create-listing form, the AI description
 * generator, the search and rental filters, the admin property manager — is
 * built from this one list, so a type added to `PROPERTY_TYPES` shows up
 * everywhere at once and no screen can offer a type the others do not know.
 *
 * `labelKey` is the key inside the `seller:propertyTypes` namespace; `fallback`
 * is the English text i18next renders while a locale is still missing the key,
 * so a new type is never shown to anyone as a raw slug.
 */
export interface PropertyTypeOption {
  value: PropertyType;
  labelKey: string;
  fallback: string;
}

const OPTION_BY_TYPE: Record<PropertyType, Omit<PropertyTypeOption, 'value'>> = {
  house: { labelKey: 'propertyTypes.house', fallback: 'House' },
  apartment: { labelKey: 'propertyTypes.apartment', fallback: 'Apartment' },
  villa: { labelKey: 'propertyTypes.villa', fallback: 'Villa' },
  'luxury-villa': { labelKey: 'propertyTypes.luxuryVilla', fallback: 'Luxury Villa' },
  commercial: { labelKey: 'propertyTypes.commercial', fallback: 'Business / Commercial' },
  parking: { labelKey: 'propertyTypes.parking', fallback: 'Parking Space' },
  land: { labelKey: 'propertyTypes.land', fallback: 'Land' },
  other: { labelKey: 'propertyTypes.other', fallback: 'Other' },
};

/** Ordered options for a property-type picker. */
export const PROPERTY_TYPE_OPTIONS: readonly PropertyTypeOption[] = PROPERTY_TYPES.map((value) => ({
  value,
  ...OPTION_BY_TYPE[value],
}));

/**
 * Types that describe a dwelling — the only ones for which room counts,
 * bedrooms and bathrooms are meaningful. Land, parking and commercial units
 * are measured in area and, for commercial, floor position alone.
 */
const RESIDENTIAL_TYPES: ReadonlySet<PropertyType> = new Set<PropertyType>([
  'house',
  'apartment',
  'villa',
  'luxury-villa',
]);

export const isResidentialPropertyType = (type: PropertyType): boolean => RESIDENTIAL_TYPES.has(type);

/**
 * Types with no interior to describe room by room. A parking space and a plot
 * of land both fall here: the form hides room counts, floor plans and interior
 * features for them.
 */
const UNBUILT_TYPES: ReadonlySet<PropertyType> = new Set<PropertyType>(['land', 'parking']);

export const hasHabitableInterior = (type: PropertyType): boolean => !UNBUILT_TYPES.has(type);
