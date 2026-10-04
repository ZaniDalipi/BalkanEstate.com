import { createHash } from 'crypto';
import { stripCloudinaryTransforms } from '../../utils/cloudinaryUrl';
import type { MediaAssetKind } from '../../models/MediaAsset';
import { CITY_CONVENTION_FOLDER } from '../../config/mediaVariants';
import { mediaFolder, legacyKey, photoKey, PRIVATE_MEDIA_KINDS, type MediaKeyContext } from './mediaKeys';

/**
 * Pure helpers for moving Cloudinary images into R2 (scripts/migrateCloudinaryToR2.ts):
 * finding Cloudinary URLs in documents, and deciding where each photo goes
 * from the document that references it (owner, listing, agency…).
 */

/** Every Cloudinary image URL inside a string (a field may hold HTML with several). */
export const CLOUDINARY_IMAGE_URL_RE =
  /https?:\/\/res\.cloudinary\.com\/([a-zA-Z0-9_-]+)\/image\/(upload|authenticated|private)\/([^\s"'<>()\\]+)/g;

export interface CloudinaryRef {
  /** The URL exactly as it appears in the document. */
  url: string;
  cloud: string;
  deliveryType: 'upload' | 'authenticated' | 'private';
  publicId: string;
  /** File extension of the original, without the dot ('' when the URL has none). */
  format: string;
}

/** Parse one Cloudinary image URL; null when it isn't one. */
export const parseCloudinaryUrl = (url: string): CloudinaryRef | null => {
  const re = new RegExp(CLOUDINARY_IMAGE_URL_RE.source);
  const match = url.match(re);
  if (!match || match.index !== 0) return null;
  const [whole, cloud, deliveryType, rawRest] = match;
  const rest = stripCloudinaryTransforms(rawRest.split(/[?#]/)[0]);
  const parts = rest.split('/').filter(Boolean);
  if (parts.length && /^v\d+$/.test(parts[0])) parts.shift();
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  const dot = last.lastIndexOf('.');
  const format = dot > 0 ? last.slice(dot + 1).toLowerCase() : '';
  parts[parts.length - 1] = dot > 0 ? last.slice(0, dot) : last;
  let publicId: string;
  try {
    publicId = decodeURIComponent(parts.join('/'));
  } catch {
    publicId = parts.join('/');
  }
  return { url: whole, cloud, deliveryType: deliveryType as CloudinaryRef['deliveryType'], publicId, format };
};

/** Every Cloudinary image URL in a string, parsed. */
export const findCloudinaryUrls = (text: string): CloudinaryRef[] => {
  const out: CloudinaryRef[] = [];
  for (const match of text.matchAll(CLOUDINARY_IMAGE_URL_RE)) {
    const ref = parseCloudinaryUrl(match[0]);
    if (ref) out.push(ref);
  }
  return out;
};

/** Where a migrated photo goes and what it is. */
export interface MigrationTarget {
  kind: MediaAssetKind;
  context: MediaKeyContext;
}

const str = (value: unknown): string | undefined => (value == null || value === '' ? undefined : String(value));

const at = (doc: any, path: string): any => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc);

/**
 * What a Cloudinary URL found at `path` of a document in `modelName` is, and
 * whose. null = no owner can be told; the photo goes to legacy/.
 */
export const classifyReference = (modelName: string, doc: any, path: string): MigrationTarget | null => {
  const id = str(doc?._id);
  const root = path.split('.')[0];
  switch (modelName) {
    case 'Property': {
      const context = { userId: str(doc.sellerId), propertyId: id };
      if (/^floorplan/i.test(root)) return { kind: 'floorplan', context };
      if (root === 'images' || root === 'imageUrl') return { kind: 'property', context };
      return null;
    }
    case 'ArchivedListing':
      return root.startsWith('thumbnail')
        ? { kind: 'property', context: { userId: str(doc.sellerId), propertyId: str(doc.originalPropertyId) } }
        : null;
    case 'User':
      if (root.startsWith('avatar')) return { kind: 'avatar', context: { userId: id } };
      if (root === 'agentLicense') return { kind: 'license', context: { userId: id } };
      return null;
    case 'Agent': {
      if (root !== 'credentials') return null;
      const index = path.split('.')[1];
      const credential = at(doc, `credentials.${index}`) || {};
      return {
        kind: 'credential',
        context: { userId: str(doc.userId), credentialId: str(credential._id) || str(credential.id) },
      };
    }
    case 'Agency': {
      const context = { agencyId: id, userId: str(doc.ownerId) };
      if (root.startsWith('logo')) return { kind: 'agency-logo', context };
      if (root.startsWith('cover')) return { kind: 'agency-cover', context };
      return null;
    }
    case 'BusinessListing': {
      const context = { businessListingId: id, userId: str(doc.userId) || str(doc.ownerId) };
      if (root.startsWith('logo')) return { kind: 'business-logo', context };
      if (root.startsWith('banner')) return { kind: 'business-banner', context };
      return null;
    }
    case 'Message':
      return { kind: 'message', context: { conversationId: str(doc.conversationId), userId: str(doc.senderId) } };
    case 'CityMarketData':
    case 'CityMarketSnapshot':
    case 'CityShowcase':
    case 'VillaDestination':
      return { kind: 'city', context: { country: str(doc.country), city: str(doc.city) || str(doc.name) } };
    case 'AdBanner':
      return { kind: 'ad-banner', context: {} };
    case 'SiteSettings':
      if (root.startsWith('emailLogo')) return { kind: 'site-email-logo', context: {} };
      if (root.startsWith('logo')) return { kind: 'site-logo', context: {} };
      return { kind: 'site-content', context: {} };
    case 'News':
    case 'Article':
      return { kind: 'news', context: {} };
    case 'SiteContent':
    case 'EmailConfig':
    case 'Testimonial':
      return { kind: 'site-content', context: {} };
    default:
      return null;
  }
};

/** Convention city photos (`city-{country}-{city}`), looked up by name from the frontend. */
export const isCityConventionId = (publicId: string): boolean => /^city-[a-z0-9-]+$/.test(publicId);

/**
 * Photo id for a migrated image — derived from the Cloudinary public id so a
 * re-run after a crash writes the same objects instead of new copies.
 */
export const migratedPhotoId = (cloudinaryPublicId: string): string =>
  `m${createHash('sha1').update(cloudinaryPublicId).digest('hex').slice(0, 15)}`;

/** The R2 key, kind and bucket a Cloudinary image is migrated to. */
export const planMigration = (
  ref: Pick<CloudinaryRef, 'publicId' | 'deliveryType'>,
  target: MigrationTarget | null
): { key: string; kind: MediaAssetKind; context: MediaKeyContext; bucket: 'public' | 'private' } => {
  // Anything Cloudinary kept behind signed delivery stays private.
  const forcedPrivate = ref.deliveryType !== 'upload';
  if (!target && isCityConventionId(ref.publicId)) {
    return { key: `${CITY_CONVENTION_FOLDER}/${ref.publicId}`, kind: 'city', context: {}, bucket: forcedPrivate ? 'private' : 'public' };
  }
  if (!target) {
    return { key: legacyKey(ref.publicId), kind: 'legacy', context: {}, bucket: forcedPrivate ? 'private' : 'public' };
  }
  const bucket = forcedPrivate || PRIVATE_MEDIA_KINDS.has(target.kind) ? 'private' : 'public';
  return {
    key: photoKey(mediaFolder(target.kind, target.context), migratedPhotoId(ref.publicId)),
    kind: target.kind,
    context: target.context,
    bucket,
  };
};
