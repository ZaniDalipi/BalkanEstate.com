import type { TFunction } from 'i18next';
import type { ColumnTarget } from '../../../../utils/csvImport';

const DEFAULTS: Record<ColumnTarget, string> = {
  unitNumber: 'Unit number',
  building: 'Building',
  floor: 'Floor',
  unitType: 'Type',
  beds: 'Bedrooms',
  baths: 'Bathrooms',
  livingRooms: 'Living rooms',
  totalArea: 'Area (m²)',
  netArea: 'Net area (m²)',
  terraceArea: 'Terrace (m²)',
  balconies: 'Balconies',
  price: 'Price',
  pricePerSqm: 'Price per m²',
  currency: 'Currency',
  availability: 'Availability',
  orientation: 'Orientation',
  viewType: 'View',
  features: 'Features',
  description: 'Description',
  ignore: 'Don’t import',
};

/** The label of an import target in the current language. */
export const fieldLabel = (t: TFunction, target: ColumnTarget): string => String(t(`import.field.${target}`, DEFAULTS[target]));

export const FIELD_LABEL_DEFAULTS = DEFAULTS;
