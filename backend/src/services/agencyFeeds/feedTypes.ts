/**
 * Domain types for the agency property-feed integration.
 *
 * The pipeline is: fetch XML → read records (XmlNode trees) → map fields with
 * the feed's mapping → normalize/validate into `NormalizedListing` → stage →
 * plan → apply. Every stage only depends on the types declared here, so each
 * can be tested on its own.
 */
import type { PropertyType } from '../../config/propertyTypes';

/** One XML element, reduced to what mapping needs. Names are namespace-local. */
export interface XmlNode {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  /** Concatenated text and CDATA content directly inside this element. */
  text: string;
}

/** Fields an agency feed can supply. Mapping paths are keyed by these names. */
export const FEED_FIELDS = [
  'externalId',
  'status',
  'sourceUrl',
  'title',
  'description',
  'listingType',
  'rentPeriod',
  'propertyType',
  'price',
  'currency',
  'priceOnRequest',
  'country',
  'city',
  'district',
  'address',
  'addressVisibility',
  'latitude',
  'longitude',
  'area',
  'landArea',
  'bedrooms',
  'bathrooms',
  'livingRooms',
  'floor',
  'totalFloors',
  'yearBuilt',
  'energyRating',
  'amenities',
  'images',
  'floorplans',
  'updatedAt',
] as const;

export type FeedField = (typeof FEED_FIELDS)[number];

/** Fields whose path may match several elements (all values are kept, in order). */
export const MULTI_VALUE_FIELDS: ReadonlySet<FeedField> = new Set(['amenities', 'images', 'floorplans']);

export type ValueMapName = 'listingType' | 'propertyType' | 'status' | 'rentPeriod' | 'addressVisibility';

/**
 * How to read a non-canonical feed. Paths are `/`-separated element local
 * names relative to the record element, optionally ending in `@attribute`;
 * `.` is the record itself. Examples: `price`, `price/@currency`,
 * `location/city`, `photos/photo/@src`, `@id`.
 */
export interface FeedMapping {
  /** Local name of the element that wraps one listing, e.g. `property`. */
  recordElement: string;
  fields: Partial<Record<FeedField, string>>;
  /** Source value → our value, matched case-insensitively. Takes precedence over built-in synonyms. */
  valueMaps?: Partial<Record<ValueMapName, Record<string, string>>>;
  /** Agency-declared constants, used only when a record has no value. */
  defaults?: { country?: string; currency?: string };
  areaUnit?: 'm2' | 'sqft';
  /** Paths relative to the document root for feed-level metadata. */
  feed?: {
    totalCount?: string;
    nextPage?: string;
  };
}

export type FeedMode = 'snapshot' | 'delta';

export type ListingStatusFromFeed = 'active' | 'sold' | 'rented' | 'reserved' | 'removed';

/** A listing after mapping, normalization and validation. Only values the source supplied. */
export interface NormalizedListing {
  externalId: string;
  feedStatus: ListingStatusFromFeed;
  sourceUrl?: string;
  title: string;
  description: string;
  listingType: 'sale' | 'rent';
  rentPeriod?: 'monthly' | 'weekly' | 'daily';
  propertyType: PropertyType;
  price: number;
  isNegotiable: boolean;
  country: string;
  city: string;
  /** What we may show publicly: exact street, or only district/city when private. */
  address: string;
  addressPrivate: boolean;
  lat?: number;
  lng?: number;
  sqft?: number;
  landArea?: number;
  beds?: number;
  baths?: number;
  livingRooms?: number;
  floorNumber?: number;
  totalFloors?: number;
  yearBuilt?: number;
  energyRating?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  amenities: string[];
  imageUrls: string[];
  floorplans: Array<{ url: string; label?: string }>;
  sourceUpdatedAt?: string;
}

export type IssueSeverity = 'error' | 'warning';

export interface FeedIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  externalId?: string;
  field?: string;
}

export interface NormalizeResult {
  listing?: NormalizedListing;
  issues: FeedIssue[];
}

/** Raised for a problem that invalidates the whole document (never per-record). */
export class FeedDocumentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'FeedDocumentError';
  }
}
