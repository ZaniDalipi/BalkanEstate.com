/**
 * Turning a typed sentence into the filter panel.
 *
 * This is the half of a Google-style search box that people notice: you type
 * "3 bedroom villa in Budva under 300k with a pool", and the bedroom, type,
 * price and pool controls move by themselves while the map flies to Budva.
 * The parser reads the sentence (`@/shared/search/parseQuery`); this maps
 * what it read onto the app's own `Filters`.
 *
 * Two rules keep it predictable:
 *
 *   - **Only what was said changes.** A sentence that mentions no price
 *     leaves the price filter exactly as the user set it, so the box adds to
 *     a search instead of resetting it.
 *   - **What was said wins.** Typing "under 200k" over an existing 500k cap
 *     replaces the cap, because the sentence is the newer instruction.
 */

import { type Filters } from '@/types';
import { parseSearchQuery, type ParsedQuery, type QueryIntent } from '@/shared/search';

export interface AppliedQuery {
  filters: Filters;
  parsed: ParsedQuery;
  /** True when the sentence moved at least one filter. */
  changedFilters: boolean;
}

/** Filter keys a parsed sentence is allowed to move, for the UI to highlight. */
export const intentFilterKeys = (intent: QueryIntent): (keyof Filters)[] => {
  const keys: (keyof Filters)[] = [];

  if (intent.listingType) keys.push('listingType');
  if (intent.propertyType) keys.push('propertyType');
  if (intent.beds) keys.push('beds');
  if (intent.baths) keys.push('baths');
  if (intent.minPrice !== undefined) keys.push('minPrice');
  if (intent.maxPrice !== undefined) keys.push('maxPrice');
  if (intent.minSqft !== undefined) keys.push('minSqft');
  if (intent.maxSqft !== undefined) keys.push('maxSqft');
  if (intent.hasPool) keys.push('hasPool');
  if (intent.hasGarden) keys.push('hasGarden');
  if (intent.hasBalcony) keys.push('hasBalcony');
  if (intent.hasParking) keys.push('minParking');
  if (intent.furnished) keys.push('furnishing');
  if (intent.seaView) keys.push('viewType');

  return keys;
};

/**
 * Apply a typed query to a filter set.
 *
 * `filters.query` is left holding only what the sentence did *not* explain —
 * usually the place name — so the text matcher never searches street names
 * for "300k" or "bedroom".
 */
export const applyQueryToFilters = (filters: Filters, query: string): AppliedQuery => {
  const parsed = parseSearchQuery(query ?? '');
  const { intent } = parsed;

  // Without a recognised phrase there is nothing to move: the whole string is
  // the search text, exactly as the user typed it.
  if (!parsed.hasIntent) {
    return { filters: { ...filters, query: query ?? '' }, parsed, changedFilters: false };
  }

  const next: Filters = { ...filters, query: parsed.text || query };

  if (intent.listingType) next.listingType = intent.listingType;
  if (intent.propertyType) next.propertyType = intent.propertyType;
  if (intent.beds !== undefined) next.beds = intent.beds;
  if (intent.baths !== undefined) next.baths = intent.baths;
  if (intent.minPrice !== undefined) next.minPrice = intent.minPrice;
  if (intent.maxPrice !== undefined) next.maxPrice = intent.maxPrice;
  if (intent.minSqft !== undefined) next.minSqft = intent.minSqft;
  if (intent.maxSqft !== undefined) next.maxSqft = intent.maxSqft;
  if (intent.hasPool) next.hasPool = true;
  if (intent.hasGarden) next.hasGarden = true;
  if (intent.hasBalcony) next.hasBalcony = true;
  // "with parking" is a request for at least one space, not for a flag.
  if (intent.hasParking) next.minParking = Math.max(1, filters.minParking ?? 0);
  if (intent.furnished) next.furnishing = 'furnished';
  if (intent.seaView) next.viewType = 'sea';

  return { filters: next, parsed, changedFilters: intentFilterKeys(intent).length > 0 };
};
