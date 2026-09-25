import type { DraftFields } from '../api/importReviewApi';

/** Draft fields the owner edits through the form (photos have their own editor). */
export type EditableField = Exclude<keyof DraftFields, 'images' | 'currency'>;
export type FormValue = string | boolean;

export const NUMBER_FIELDS: readonly EditableField[] = [
  'price', 'sqft', 'beds', 'baths', 'livingRooms', 'parking', 'yearBuilt', 'floorNumber', 'totalFloors',
];
