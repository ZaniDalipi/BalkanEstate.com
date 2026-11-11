import ArchivedListing, { ArchiveDeletedByKind } from '../models/ArchivedListing';
import type { IProperty } from '../models/Property';
import { propertyLogger } from '../utils/logger';

/**
 * Keeps a copy of every removed listing so admins can see what happened to
 * it: who removed it, when, and what it looked like. One entry point for all
 * the ways a listing can be removed (owner, admin, agency bulk action, user
 * removal), so none of them can skip the archive.
 */

export interface ArchiveActor {
  kind: ArchiveDeletedByKind;
  userId?: string;
  name?: string;
  email?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Required archive fields must not be empty, or the whole record is rejected. */
const orUnknown = (value: string | undefined | null): string => (value && value.trim() ? value : 'Unknown');

/** The photo kept with the archive; all other media is removed with the listing. */
export const archiveThumbnailPublicId = (property: IProperty): string | undefined =>
  property.imagePublicId || property.images?.[0]?.publicId || undefined;

/** The archive record for a listing being deleted. Pure, so it can be tested on its own. */
export function buildDeletedArchiveRecord(property: IProperty, actor: ArchiveActor, now: Date = new Date()) {
  const createdAt = property.createdAt ? new Date(property.createdAt) : now;
  return {
    originalPropertyId: property._id,
    sellerId: property.sellerId,
    sellerName: orUnknown(property.createdByName),
    sellerEmail: orUnknown(property.createdByEmail),
    createdAsRole: property.createdAsRole === 'agent' ? 'agent' : 'private_seller',
    createdByAgencyName: property.createdByAgencyName,
    createdByAgencyId: property.createdByAgencyId,
    archiveReason: 'deleted' as const,
    archivedAt: now,
    deletedBy: {
      kind: actor.kind,
      userId: actor.userId,
      name: actor.name,
      email: actor.email,
    },
    previousStatus: property.status,
    title: property.title,
    listingType: property.listingType === 'rent' ? 'rent' : 'sale',
    status: 'deleted' as const,
    price: Number.isFinite(property.price) ? property.price : 0,
    address: orUnknown(property.address),
    city: orUnknown(property.city),
    country: orUnknown(property.country),
    propertyType: orUnknown(property.propertyType),
    beds: property.beds,
    baths: property.baths,
    livingRooms: property.livingRooms,
    sqft: property.sqft,
    yearBuilt: property.yearBuilt,
    description: property.description,
    thumbnailUrl: property.imageUrl || property.images?.[0]?.url,
    thumbnailPublicId: archiveThumbnailPublicId(property),
    totalViews: property.views || 0,
    totalSaves: property.saves || 0,
    daysOnMarket: Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS)),
    originalCreatedAt: createdAt,
  };
}

/**
 * Archive listings that are about to be deleted. Best-effort: a failure is
 * logged and never blocks the delete itself. Returns how many were archived.
 */
export async function archiveDeletedListings(properties: IProperty[], actor: ArchiveActor): Promise<number> {
  if (properties.length === 0) return 0;
  const now = new Date();
  try {
    const docs = await ArchivedListing.insertMany(
      properties.map((p) => buildDeletedArchiveRecord(p, actor, now)),
      { ordered: false }
    );
    propertyLogger.info(`📦 Archived ${docs.length} deleted listing(s) (by ${actor.kind})`);
    return docs.length;
  } catch (error) {
    propertyLogger.error('⚠️  Error archiving deleted listings:', error);
    return 0;
  }
}

export const archiveDeletedListing = (property: IProperty, actor: ArchiveActor): Promise<number> =>
  archiveDeletedListings([property], actor);
