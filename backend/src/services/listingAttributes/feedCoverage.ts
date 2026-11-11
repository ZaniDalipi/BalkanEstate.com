import type { IListingSource } from '../../models/ListingSource';
import type { RawListing } from '../listingAdapters/types';
import {
  collectImageUrls,
  explicitListingType,
  extractMappedFields,
  parsePriceAmount,
  resolvePropertyType,
} from '../listingNormalizerService';
import { resolveLocation } from './resolveLocation';

/**
 * Which of the fields that make a good listing we can read from a feed's
 * sample listing — shown in the add-feed wizard, so the user sees at once
 * what their feed is missing before importing anything.
 */

export type CoverageField =
  | 'title' | 'price' | 'location' | 'photos'
  | 'bedrooms' | 'bathrooms' | 'area' | 'mapPosition' | 'propertyType' | 'listingType';

/** A listing can't be published without these. */
export const REQUIRED_FIELDS: readonly CoverageField[] = ['title', 'price', 'location', 'photos'];

export interface CoverageItem {
  field: CoverageField;
  required: boolean;
  found: boolean;
}

const positive = (v: unknown): boolean => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0;
};

export const feedCoverage = (
  sample: Record<string, unknown>,
  fieldMap: Record<string, string>,
  url?: string
): CoverageItem[] => {
  const raw: RawListing = { id: 'sample', url, raw: sample };
  const mapped = extractMappedFields(raw, { fieldMap } as unknown as IListingSource);
  const location = resolveLocation(mapped, url);
  const found: Record<CoverageField, boolean> = {
    title: typeof mapped.title === 'string' && mapped.title.trim().length > 0,
    price: (parsePriceAmount(mapped.price) ?? 0) > 0,
    location: Boolean(location.city),
    photos: collectImageUrls(mapped).length > 0,
    bedrooms: positive(mapped.beds),
    bathrooms: positive(mapped.baths),
    area: positive(mapped.sqft),
    mapPosition: location.lat !== undefined && location.lng !== undefined,
    propertyType: Boolean(resolvePropertyType(mapped)),
    listingType: Boolean(explicitListingType(mapped)),
  };
  return (Object.keys(found) as CoverageField[]).map((field) => ({
    field,
    required: REQUIRED_FIELDS.includes(field),
    found: found[field],
  }));
};
