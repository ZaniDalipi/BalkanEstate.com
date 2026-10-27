/**
 * Effective unit availability — the one rule that reconciles a developer's
 * declared unit state with the status of the property listings attached to it.
 *
 * Two independent values (DevelopmentUnit.availability and Property.status)
 * can drift: an agent marks a listing sold and nobody updates the unit, or a
 * developer reserves a unit whose listing is still active. Rather than syncing
 * them with dual writes (which drift again the first time a write path is
 * missed), availability is DERIVED at read time:
 *
 *   effective = the most restrictive of
 *     - the unit's declared availability, and
 *     - the state implied by each attached, non-draft listing
 *
 * so the public explorer never shows a unit as more available than any source
 * says. Listing statuses map as: active → available, pending → reserved,
 * sold → sold, rented → rented; draft (unpublished) listings are ignored.
 *
 * Restrictiveness, least to most:
 *   available < not_released (coming soon) < reserved < unavailable < rented < sold
 */
import type { UnitAvailability } from '../../config/developments';

export type ListingStatus = 'active' | 'pending' | 'sold' | 'rented' | 'draft';

export type AvailabilitySource = 'unit' | 'listing';

export interface EffectiveAvailability {
  availability: UnitAvailability;
  /** Which input decided the result; ties go to the unit's own declaration. */
  source: AvailabilitySource;
}

const RANK: Record<UnitAvailability, number> = {
  available: 0,
  not_released: 1,
  reserved: 2,
  unavailable: 3,
  rented: 4,
  sold: 5,
};

/** The availability a listing's status implies, or null when it implies nothing. */
export const availabilityFromListingStatus = (status: unknown): UnitAvailability | null => {
  switch (status) {
    case 'active':
      return 'available';
    case 'pending':
      return 'reserved';
    case 'sold':
      return 'sold';
    case 'rented':
      return 'rented';
    default:
      return null; // draft, unknown, missing
  }
};

/**
 * Resolve the effective availability of a unit from its declared state and
 * the statuses of the listings attached to it.
 */
export const resolveEffectiveAvailability = (
  declared: UnitAvailability,
  listingStatuses: ReadonlyArray<unknown> = []
): EffectiveAvailability => {
  let result: EffectiveAvailability = { availability: declared, source: 'unit' };
  for (const status of listingStatuses) {
    const implied = availabilityFromListingStatus(status);
    if (implied && RANK[implied] > RANK[result.availability]) {
      result = { availability: implied, source: 'listing' };
    }
  }
  return result;
};
