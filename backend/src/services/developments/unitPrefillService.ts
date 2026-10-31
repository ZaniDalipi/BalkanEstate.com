/**
 * "Fill from a listing": turn one of the caller's marketplace listings into
 * unit fields, so an owner who already listed an apartment doesn't type it
 * twice. Only listings the caller controls are read; only values that fit a
 * unit are returned (a rent price is not a sale price, so it is left out).
 */
import mongoose from 'mongoose';
import Property, { IProperty } from '../../models/Property';
import { IUser } from '../../models/User';
import { UNIT_ORIENTATIONS, UNIT_VIEWS, type UnitFeature } from '../../config/developments';
import { encodeId } from '../../utils/idObfuscation';
import { toObjectId } from './developmentRefs';
import { AuthorizationError, NotFoundError, callerControlsListing } from './developmentListingService';
import { ValidationError } from './developmentService';

export interface UnitPrefill {
  listing: { id: string; title: string; imageUrl?: string; listingType: 'sale' | 'rent' };
  /** Unit fields read from the listing (only those it has). */
  fields: Partial<{
    unitType: string;
    beds: number;
    baths: number;
    livingRooms: number;
    totalArea: number;
    netArea: number;
    balconies: number;
    price: number;
    pricePerSqm: number;
    orientation: string;
    viewType: string;
    description: string;
    features: UnitFeature[];
  }>;
  /** The listing's floor number, so the dashboard can suggest that floor. */
  floorLevel?: number;
  /** What was deliberately not copied, for the owner to know. */
  skipped: ('rentPrice' | 'negotiablePrice')[];
}

const TYPE_FROM_PROPERTY: Record<string, string> = { apartment: 'apartment', house: 'townhouse', villa: 'villa', 'luxury-villa': 'villa', commercial: 'commercial', parking: 'parking' };
const positive = (n: unknown): number | undefined => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined);
const count = (n: unknown): number | undefined => (typeof n === 'number' && Number.isInteger(n) && n >= 0 ? n : undefined);

/** The mapping itself, separate so it can be tested without a database. */
export const listingToUnitFields = (p: Partial<IProperty>): Pick<UnitPrefill, 'fields' | 'floorLevel' | 'skipped'> => {
  const fields: UnitPrefill['fields'] = {};
  const skipped: UnitPrefill['skipped'] = [];
  const type = p.propertyType ? TYPE_FROM_PROPERTY[p.propertyType] : undefined;
  if (type) fields.unitType = type;
  for (const k of ['beds', 'baths', 'livingRooms'] as const) {
    const v = count(p[k]);
    if (v !== undefined) fields[k] = v;
  }
  const total = positive(p.sqft) ?? positive(p.grossArea);
  if (total) fields.totalArea = total;
  const net = positive(p.netArea);
  if (net) fields.netArea = net;
  if (p.hasBalcony) fields.balconies = 1;
  if (p.listingType === 'rent') skipped.push('rentPrice');
  else if (p.isNegotiable && !positive(p.price)) skipped.push('negotiablePrice');
  else if (positive(p.price)) {
    fields.price = Math.round(p.price as number);
    if (total) fields.pricePerSqm = Math.round((p.price as number) / total);
  }
  if (p.orientation && (UNIT_ORIENTATIONS as readonly string[]).includes(p.orientation)) fields.orientation = p.orientation;
  if (p.viewType && (UNIT_VIEWS as readonly string[]).includes(p.viewType)) fields.viewType = p.viewType;
  const description = typeof p.description === 'string' ? p.description.trim().slice(0, 4000) : '';
  if (description) fields.description = description;
  const features = new Set<UnitFeature>();
  if (p.furnishing === 'furnished') features.add('furnished');
  if (p.hasGarden) features.add('garden');
  if ((p.parking ?? 0) > 0 || p.parkingType) features.add('parking');
  if ((p.storageRooms ?? 0) > 0) features.add('storage');
  if (p.viewType === 'sea') features.add('sea_view');
  if (features.size) fields.features = [...features];
  const floorLevel = typeof p.floorNumber === 'number' && Number.isInteger(p.floorNumber) ? p.floorNumber : undefined;
  return { fields, floorLevel, skipped };
};

export const getUnitPrefill = async (user: IUser, rawListingId: unknown): Promise<UnitPrefill> => {
  const listingId = toObjectId(rawListingId);
  if (!listingId) throw new ValidationError('A valid listing is required', { code: 'LISTING_NOT_FOUND' });
  const property = await Property.findById(listingId).lean<IProperty & { _id: mongoose.Types.ObjectId }>();
  if (!property) throw new NotFoundError('Listing not found', { code: 'LISTING_NOT_FOUND' });
  if (!(await callerControlsListing(user, property))) throw new AuthorizationError('You can only copy from your own listings.', { code: 'LISTING_NOT_YOURS' });
  return {
    listing: {
      id: encodeId(String(property._id)),
      title: property.title ?? '',
      imageUrl: property.imageUrl || property.images?.[0]?.url,
      listingType: property.listingType,
    },
    ...listingToUnitFields(property),
  };
};
