import { randomBytes } from 'crypto';
import { safeId, slugify, namedSegment } from './mediaNaming';
import type { MediaAssetKind } from '../../models/MediaAsset';

/**
 * Where each photo lives in R2. Folders read "{name}_{id}" so the bucket is
 * browsable by person and listing:
 *
 *   users/zani-dalipi_69a95232…/listings/house-in-split_6a65fc9e…/photos/{photoId}/w640.webp
 *
 * The name is taken when the photo is uploaded; a renamed user or retitled
 * listing keeps its existing folders (the id in them doesn't change). Nothing
 * finds a photo by folder name — deletes go by id through MediaAsset.
 *
 * Everything here is pure so it can be unit tested without R2 or Mongo.
 */

export interface MediaKeyContext {
  userId?: string;
  /** Display name of the user — for the readable folder name. */
  userName?: string;
  propertyId?: string;
  /** Listing title — for the readable folder name. */
  propertyTitle?: string;
  /** The listing's own reference, as the agency/seller entered it (Property.propertyId). */
  propertyRef?: string;
  agencyId?: string;
  agencyName?: string;
  developmentId?: string;
  developmentName?: string;
  businessListingId?: string;
  businessName?: string;
  credentialId?: string;
  conversationId?: string;
  country?: string;
  city?: string;
  sourceSlug?: string;
  sourceListingId?: string;
}

/** Kinds stored in the private bucket (presigned URLs only). */
export const PRIVATE_MEDIA_KINDS: ReadonlySet<MediaAssetKind> = new Set(['license', 'credential']);

export const DRAFTS_SEGMENT = 'drafts';

const seg = (value: string | undefined, fallback: string): string => safeId(value) || fallback;

/** users/{name}_{userId} */
export const userFolder = (ctx: Pick<MediaKeyContext, 'userId' | 'userName'>): string =>
  `users/${namedSegment(ctx.userName, ctx.userId)}`;

/** Listing photos/floor plans folder — the user's drafts folder while there's no listing yet. */
export const listingMediaFolder = (
  ctx: Pick<MediaKeyContext, 'userId' | 'userName' | 'propertyId' | 'propertyTitle' | 'propertyRef'>,
  sub: 'photos' | 'floorplans'
): string => {
  const root = `${userFolder(ctx)}/listings`;
  if (!ctx.propertyId) return `${root}/${DRAFTS_SEGMENT}/${sub}`;
  // "{title}-{reference}_{id}", e.g. house-in-split-ab-123_6a65fc9e…
  const label = [ctx.propertyTitle, ctx.propertyRef].filter(Boolean).join(' ');
  return `${root}/${namedSegment(label, ctx.propertyId, 'unknown', 60)}/${sub}`;
};

/** The folder (without the photo id) a photo of `kind` belongs in. */
export const mediaFolder = (kind: MediaAssetKind, ctx: MediaKeyContext): string => {
  const user = userFolder(ctx);
  switch (kind) {
    case 'property':
      return listingMediaFolder(ctx, 'photos');
    case 'floorplan':
      return listingMediaFolder(ctx, 'floorplans');
    case 'avatar':
      return `${user}/avatar`;
    case 'license':
      return `${user}/documents/license`;
    case 'credential':
      return ctx.credentialId ? `${user}/documents/credentials/${seg(ctx.credentialId, 'unknown')}` : `${user}/documents/credentials`;
    case 'agency-logo':
      return `agencies/${namedSegment(ctx.agencyName, ctx.agencyId || ctx.userId)}/logo`;
    case 'agency-cover':
      return `agencies/${namedSegment(ctx.agencyName, ctx.agencyId || ctx.userId)}/cover`;
    case 'development-cover':
      return `developments/${namedSegment(ctx.developmentName, ctx.developmentId || ctx.userId)}/cover`;
    case 'development-scene':
      return `developments/${namedSegment(ctx.developmentName, ctx.developmentId || ctx.userId)}/scenes`;
    case 'development-builder-logo':
      return `developments/${namedSegment(ctx.developmentName, ctx.developmentId || ctx.userId)}/builder/logo`;
    case 'development-builder-banner':
      return `developments/${namedSegment(ctx.developmentName, ctx.developmentId || ctx.userId)}/builder/banner`;
    case 'business-logo':
      return `businesses/${namedSegment(ctx.businessName, ctx.businessListingId || ctx.userId)}/logo`;
    case 'business-banner':
      return `businesses/${namedSegment(ctx.businessName, ctx.businessListingId || ctx.userId)}/banner`;
    case 'site-logo':
      return 'site/logo';
    case 'site-email-logo':
      return 'site/email-logo';
    case 'ad-banner':
      return 'site/ad-banners';
    case 'site-content':
      return 'site/content';
    case 'message':
      return `messages/${seg(ctx.conversationId, 'unknown')}`;
    case 'city':
      return `cities/${slugify(ctx.country) || 'unknown'}/${slugify(ctx.city) || 'unknown'}`;
    case 'destination':
      // Villa destinations: `city` carries the destination's name.
      return `destinations/${slugify(ctx.country) || 'unknown'}/${slugify(ctx.city) || 'unknown'}`;
    case 'news':
      return 'news';
    case 'external':
      return `external/${slugify(ctx.sourceSlug) || 'unknown-source'}/${seg(ctx.sourceListingId, 'unsorted')}`;
    case 'legacy':
      return 'legacy';
    default: {
      const unreachable: never = kind;
      throw new Error(`Unknown media kind: ${String(unreachable)}`);
    }
  }
};

/**
 * A new photo id: base36 time + random, so photos in a folder sort by upload
 * time and two uploads of the same file never share a folder (deleting one
 * must never delete the other).
 */
export const newPhotoId = (now: number = Date.now()): string =>
  // Fixed-width time part: base36 strings of different lengths don't sort as numbers.
  `${now.toString(36).padStart(9, '0')}${randomBytes(4).toString('hex')}`;

export const photoKey = (folder: string, photoId: string): string => `${folder}/${photoId}`;

/** True for a photo uploaded from the listing form before its listing existed. */
export const isDraftListingKey = (key: string): boolean => /^users\/[^/]+\/listings\/drafts\//.test(key);

/** The id part of a photo key (its last segment). */
export const photoIdOf = (key: string): string => key.slice(key.lastIndexOf('/') + 1);

/**
 * Key for a photo migrated from storage whose owner the migration couldn't
 * tell. Keeps the public id's own path so it stays recognisable.
 */
export const legacyKey = (cloudinaryPublicId: string): string =>
  `legacy/${cloudinaryPublicId.replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/\/+/g, '/').replace(/^\/|\/$/g, '')}`;
