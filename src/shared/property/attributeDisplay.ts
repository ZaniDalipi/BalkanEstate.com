/**
 * How each type attribute is named and drawn, wherever it is shown.
 *
 * The companion to `typeAttributes`: that table says *which* attributes a
 * listing of a given type carries, this says what each one looks like to a
 * reader. Split that way so a page decides nothing on its own — it asks the
 * table what to show and asks this how to label it, and a shop, a garage and a
 * flat are then described consistently on the card, the detail page and
 * anywhere else without each surface reinventing the vocabulary.
 *
 * Every entry carries an English fallback next to its key so a locale that has
 * not caught up shows a real word rather than a dotted key path.
 */

import { PARKING_TYPES, type ParkingType, type TypeAttribute } from './typeAttributes';

export interface AttributeDisplay {
  /** Translation key, resolved against the `property` namespace. */
  key: string;
  /** Shown when the active locale has no translation yet. */
  fallback: string;
  icon: string;
  /** Printed after the value — areas are in m², counts have no unit. */
  unit?: string;
  /**
   * The value is a term to translate rather than a number to print. Its key is
   * `<valueKey>.<value>`, which is how the listing form already labels these.
   */
  valueKey?: string;
}

export const ATTRIBUTE_DISPLAY: Record<TypeAttribute, AttributeDisplay> = {
  beds: { key: 'features.bedrooms', fallback: 'Bedrooms', icon: '🛏️' },
  baths: { key: 'features.bathrooms', fallback: 'Bathrooms', icon: '🚿' },
  livingRooms: { key: 'details.livingRoomPlural', fallback: 'Living rooms', icon: '🛋️' },
  kitchens: { key: 'details.kitchens', fallback: 'Kitchens', icon: '🍳' },
  diningRooms: { key: 'details.diningRooms', fallback: 'Dining rooms', icon: '🍽️' },
  toilets: { key: 'details.toilets', fallback: 'Toilets (WC)', icon: '🚻' },
  storageRooms: { key: 'details.storageRooms', fallback: 'Storage rooms', icon: '📦' },
  offices: { key: 'details.offices', fallback: 'Offices', icon: '💼' },
  openPlanArea: { key: 'details.openPlanArea', fallback: 'Open-plan area', icon: '🪟', unit: 'm²' },
  parking: { key: 'features.parking', fallback: 'Parking', icon: '🅿️' },
  parkingType: {
    key: 'details.parkingType',
    fallback: 'Parking type',
    icon: '🚗',
    valueKey: 'details.parkingTypes',
  },
  floorNumber: { key: 'features.floor', fallback: 'Floor', icon: '🏢' },
  totalFloors: { key: 'features.floors', fallback: 'Floors', icon: '🏬' },
};

/** English names for the parking arrangements, used as translation fallbacks. */
export const PARKING_TYPE_FALLBACKS: Record<ParkingType, string> = {
  garage: 'Garage',
  underground: 'Underground',
  covered: 'Covered',
  outdoor: 'Outdoor',
};

/** True when `value` is one of the arrangements a parking space may have. */
export const isParkingTypeValue = (value: unknown): value is ParkingType =>
  typeof value === 'string' && (PARKING_TYPES as readonly string[]).includes(value);
