import { randomBytes } from 'crypto';
import { safeId, slugify } from './mediaNaming';
import type { MediaAssetKind } from '../../models/MediaAsset';

/**
 * Where each photo lives in R2. Folders are built from ids, never names, so a
 * renamed user or retitled listing never strands a photo or forces a copy.
 * Names live in MongoDB (MediaAsset → User / Property) where they can change.
 *
 *   users/{userId}/listings/{propertyId}/photos/{photoId}/w640.webp
 *
 * Everything here is pure so it can be unit tested without R2 or Mongo.
 */

export interface MediaKeyContext {
  userId?: string;
  propertyId?: string;
  agencyId?: string;
  businessListingId?: string;
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

/** Listing photos/floor plans folder — the drafts folder while there's no listing yet. */
export const listingMediaFolder = (userId: string | undefined, propertyId: string | undefined, sub: 'photos' | 'floorplans'): string => {
  const root = `users/${seg(userId, 'unknown')}/listings`;
  return propertyId ? `${root}/${seg(propertyId, 'unknown')}/${sub}` : `${root}/${DRAFTS_SEGMENT}/${sub}`;
};

/** The folder (without the photo id) a photo of `kind` belongs in. */
export const mediaFolder = (kind: MediaAssetKind, ctx: MediaKeyContext): string => {
  const user = `users/${seg(ctx.userId, 'unknown')}`;
  switch (kind) {
    case 'property':
      return listingMediaFolder(ctx.userId, ctx.propertyId, 'photos');
    case 'floorplan':
      return listingMediaFolder(ctx.userId, ctx.propertyId, 'floorplans');
    case 'avatar':
      return `${user}/avatar`;
    case 'license':
      return `${user}/documents/license`;
    case 'credential':
      return ctx.credentialId ? `${user}/documents/credentials/${seg(ctx.credentialId, 'unknown')}` : `${user}/documents/credentials`;
    case 'agency-logo':
      return `agencies/${seg(ctx.agencyId || ctx.userId, 'unknown')}/logo`;
    case 'agency-cover':
      return `agencies/${seg(ctx.agencyId || ctx.userId, 'unknown')}/cover`;
    case 'business-logo':
      return `businesses/${seg(ctx.businessListingId || ctx.userId, 'unknown')}/logo`;
    case 'business-banner':
      return `businesses/${seg(ctx.businessListingId || ctx.userId, 'unknown')}/banner`;
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
 * Key for a photo migrated from Cloudinary whose owner the migration couldn't
 * tell. Keeps the public id's own path so it stays recognisable.
 */
export const legacyKey = (cloudinaryPublicId: string): string =>
  `legacy/${cloudinaryPublicId.replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/\/+/g, '/').replace(/^\/|\/$/g, '')}`;
