import type { ListingType } from '@/src/shared/types/businessListing.types';

/** `?type=` on the create form's URL → a listing type to start on; anything else → none (the form's own default). */
export function listingTypeFromQuery(value: string | null): ListingType | undefined {
  return value === 'individual' || value === 'business' ? value : undefined;
}
