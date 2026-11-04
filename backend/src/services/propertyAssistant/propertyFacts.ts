/**
 * What the property assistant may know about a listing.
 *
 * A whitelist, on purpose: the listing document also holds the seller's email,
 * tenant names, private notes and rental history, none of which a buyer's
 * question may ever surface. Only public, descriptive fields are copied, and
 * empty ones are dropped so the model is not invited to talk about them.
 */

export interface PropertyFacts {
  [key: string]: string | number | boolean | string[];
}

const SCALAR_FIELDS = [
  'title', 'propertyType', 'listingType', 'price', 'currency', 'isNegotiable',
  'city', 'country', 'address', 'beds', 'baths', 'livingRooms', 'kitchens', 'toilets',
  'sqft', 'netArea', 'grossArea', 'landArea', 'floorNumber', 'totalFloors', 'yearBuilt',
  'condition', 'constructionStatus', 'furnishing', 'heatingType', 'energyRating',
  'viewType', 'orientation', 'parkingType', 'hasBalcony', 'hasGarden', 'hasPool',
  'hasElevator', 'hasAirConditioning', 'hasSecurity', 'petsAllowed',
  'distanceToCenter', 'distanceToSea', 'distanceToSchool', 'distanceToHospital',
  'monthlyRent', 'securityDeposit', 'utilitiesIncluded', 'availableFrom',
] as const;

const LIST_FIELDS = ['amenities', 'specialFeatures', 'materials'] as const;

/** Longest description passed on; listings with essays get their opening. */
export const MAX_DESCRIPTION_CHARS = 2000;

type Source = Record<string, unknown>;

function scalar(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, 300) : null;
  }
  return null;
}

export function buildPropertyFacts(listing: Source): PropertyFacts {
  const facts: PropertyFacts = {};
  for (const field of SCALAR_FIELDS) {
    const value = scalar(listing[field]);
    if (value !== null) facts[field] = value;
  }
  for (const field of LIST_FIELDS) {
    const value = listing[field];
    if (Array.isArray(value)) {
      const items = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').slice(0, 30);
      if (items.length) facts[field] = items;
    }
  }
  if (typeof listing.description === 'string' && listing.description.trim()) {
    facts.description = listing.description.trim().slice(0, MAX_DESCRIPTION_CHARS);
  }
  const price = typeof facts.price === 'number' ? facts.price : null;
  const area = [facts.netArea, facts.sqft, facts.grossArea].find((a) => typeof a === 'number' && a > 0);
  if (price && typeof area === 'number') facts.pricePerSquareMetre = Math.round(price / area);
  return facts;
}
