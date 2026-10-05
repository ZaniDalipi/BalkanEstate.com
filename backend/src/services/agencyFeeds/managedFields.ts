import { createHash } from 'crypto';
import { attributesForType } from '../../config/typeAttributes';
import type { NormalizedListing } from './feedTypes';

/**
 * Which listing fields a feed owns, and which stay the agency's to edit.
 *
 * SOURCE-MANAGED (written by every sync from the feed):
 *   title, description, listingType, rentPeriod, propertyType, price,
 *   isNegotiable, status, country, city, address, lat, lng, sqft, landArea,
 *   beds, baths, livingRooms, floorNumber, totalFloors, yearBuilt,
 *   energyRating, amenities, images (+ imageUrl), floorplans, sourceUrl.
 *
 * LOCAL-ONLY (never read from or written by a sync): everything else —
 *   promotions and badges, videos and virtual tours, viewing availability,
 *   special features, materials, furnishing/heating/condition/view,
 *   rental terms and tenant data, the internal propertyId, and stats.
 *
 * A source-managed field is still never overwritten silently: the sync
 * records a fingerprint of each value it writes (`feedSync.managedHashes`).
 * If the stored value no longer matches that fingerprint, someone edited it
 * on BalkanEstateAI, and the sync keeps the local value and reports it in the
 * run ("local edits kept"). Agencies can also lock a field explicitly
 * (`feedSync.lockedFields`) — or unlock it to let the feed take over again.
 */
export const SOURCE_MANAGED_FIELDS = [
  'title',
  'description',
  'listingType',
  'rentPeriod',
  'propertyType',
  'price',
  'isNegotiable',
  'status',
  'country',
  'city',
  'address',
  'lat',
  'lng',
  'sqft',
  'landArea',
  'beds',
  'baths',
  'livingRooms',
  'floorNumber',
  'totalFloors',
  'yearBuilt',
  'energyRating',
  'amenities',
  'images',
  'floorplans',
  'sourceUrl',
] as const;

export type SourceManagedField = (typeof SOURCE_MANAGED_FIELDS)[number];

/** Fields an agency may lock. Coordinates follow the address. */
export const LOCKABLE_FIELDS: readonly SourceManagedField[] = SOURCE_MANAGED_FIELDS.filter(
  (f) => f !== 'lat' && f !== 'lng' && f !== 'isNegotiable'
);

/** Fields that follow another field's lock. */
export const LOCK_FOLLOWERS: Partial<Record<SourceManagedField, SourceManagedField[]>> = {
  address: ['lat', 'lng'],
  price: ['isNegotiable'],
};

const canonical = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (key === '_id') continue;
      const v = canonical(obj[key]);
      if (v !== null) out[key] = v;
    }
    return out;
  }
  return value;
};

/** Order-sensitive, key-order-insensitive fingerprint; undefined, null and '' are equal. */
export const stableHash = (value: unknown): string =>
  createHash('sha1').update(JSON.stringify(canonical(value))).digest('hex');

export const FEED_STATUS_TO_PROPERTY_STATUS = {
  active: 'active',
  reserved: 'pending',
  sold: 'sold',
  rented: 'rented',
} as const;

/**
 * Property field values for a listing. Schema-required details the feed did
 * not state are written as the schema's "not provided" value (0) and listed
 * in `missingDetails`, so they are known to be unstated rather than zero.
 */
export const buildManagedValues = (
  listing: NormalizedListing,
  coordinates: { lat: number; lng: number }
): { values: Partial<Record<SourceManagedField, unknown>>; missingDetails: string[] } => {
  const missingDetails: string[] = [];
  const typeAttributes = attributesForType(listing.propertyType);
  const requiredCount = (value: number | undefined, attribute: 'beds' | 'baths' | 'livingRooms'): number | undefined => {
    if (value !== undefined) return value;
    if (!typeAttributes.includes(attribute)) return undefined;
    missingDetails.push(attribute);
    return 0;
  };
  if (listing.sqft === undefined) missingDetails.push('sqft');
  if (listing.yearBuilt === undefined) missingDetails.push('yearBuilt');

  const values: Partial<Record<SourceManagedField, unknown>> = {
    title: listing.title,
    description: listing.description,
    listingType: listing.listingType,
    rentPeriod: listing.listingType === 'rent' ? listing.rentPeriod : undefined,
    propertyType: listing.propertyType,
    price: listing.price,
    isNegotiable: listing.isNegotiable,
    status: FEED_STATUS_TO_PROPERTY_STATUS[listing.feedStatus as keyof typeof FEED_STATUS_TO_PROPERTY_STATUS] ?? 'active',
    country: listing.country,
    city: listing.city,
    address: listing.address,
    lat: coordinates.lat,
    lng: coordinates.lng,
    sqft: listing.sqft ?? 0,
    landArea: listing.landArea,
    beds: requiredCount(listing.beds, 'beds'),
    baths: requiredCount(listing.baths, 'baths'),
    livingRooms: requiredCount(listing.livingRooms, 'livingRooms'),
    floorNumber: listing.floorNumber,
    totalFloors: listing.totalFloors,
    yearBuilt: listing.yearBuilt ?? 0,
    energyRating: listing.energyRating,
    amenities: listing.amenities,
    sourceUrl: listing.sourceUrl,
  };
  return { values, missingDetails };
};

/** Fingerprint of everything in a normalized record; equal hash ⇒ nothing to update. */
export const listingHash = (listing: NormalizedListing): string => stableHash(listing);
