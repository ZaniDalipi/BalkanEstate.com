/**
 * The room/area tags a listing photo may carry.
 *
 * This is the backend's single source of truth: the Mongoose enum on
 * `Property.images[].tag` and the Gemini image-tagging schema read from here.
 * It mirrors `PROPERTY_IMAGE_TAGS` in `src/shared/types/property.types.ts` on
 * the frontend — the two lists are the same contract seen from either side of
 * the API.
 */
export const PROPERTY_IMAGE_TAGS = [
  'exterior',
  'living_room',
  'kitchen',
  'dining_room',
  'bedroom',
  'kids_room',
  'bathroom',
  'wc',
  'hallway',
  'office',
  'laundry',
  'storage',
  'balcony',
  'terrace',
  'garden',
  'pool',
  'garage',
  'basement',
  'attic',
  'view',
  'other',
] as const;

export type PropertyImageTag = (typeof PROPERTY_IMAGE_TAGS)[number];
