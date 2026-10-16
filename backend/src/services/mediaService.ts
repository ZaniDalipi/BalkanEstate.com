import sharp from 'sharp';
import mongoose from 'mongoose';
import { mediaLogger } from '../utils/logger';
import { registerFileUpload, removeFileRecord, getUserFiles } from './storageAccessPolicy';
import { applyWatermark, WatermarkOptions } from './watermarkService';
import { isR2Enabled, missingR2Vars } from '../config/r2';
import MediaAsset, { type MediaAssetKind } from '../models/MediaAsset';
import {
  storeImage,
  deleteKeys,
  deleteWhere,
  moveAsset,
  storedUrlFor,
  type StoredImage,
} from './media/r2MediaStore';
import { listingMediaFolder, isDraftListingKey, type MediaKeyContext } from './media/mediaKeys';
import { resolveMediaNames } from './media/mediaNames';
import { MAX_INPUT_PIXELS, type MasterOptions } from './media/imageVariants';

/**
 * Media service — every image upload and delete in the app goes through here.
 *
 * Photos live in Cloudflare R2 (config/r2.ts). Each one is stored once with
 * all its display sizes pre-generated (config/mediaVariants.ts) and indexed
 * in MongoDB (models/MediaAsset.ts), which is what deletes and cleanup query.
 * See docs/MEDIA_STORAGE.md for the layout.
 */

export interface MediaUploadResult {
  url: string;
  /** The photo's R2 key (its folder). Stored as `publicId` on documents. */
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/** Upload types handled by uploadImage; other kinds go through uploadMedia. */
export type UploadType = Extract<
  MediaAssetKind,
  | 'property'
  | 'floorplan'
  | 'avatar'
  | 'license'
  | 'credential'
  | 'agency-logo'
  | 'agency-cover'
  | 'development-cover'
  | 'business-logo'
  | 'business-banner'
  | 'site-logo'
  | 'site-email-logo'
  | 'ad-banner'
>;

export interface UploadOptions {
  userId: string;
  /** Kept for callers that pass it; folders are named by id. */
  userEmail?: string;
  userName?: string;
  propertyId?: string;
  propertyTitle?: string;
  /** The listing's own reference (Property.propertyId), for the folder name. */
  propertyRef?: string;
  agencyId?: string;
  agencyName?: string;
  developmentId?: string;
  developmentName?: string;
  businessListingId?: string;
  businessName?: string;
  credentialId?: string;
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /**
   * Keep more detail in the stored master (q90, 4:4:4 chroma) for images
   * shown nearly full-bleed.
   */
  preserveQuality?: boolean;
  /** Skip the ownership FileRecord (for public uploads with no real user). */
  skipRegistration?: boolean;
}

export { isR2Enabled };

/** True when uploads can be stored. Controllers check this before accepting a file. */
export const isMediaStorageConfigured = (): boolean => isR2Enabled();

/** The error to show when R2 isn't configured. */
export const mediaStorageNotConfiguredMessage = (): string =>
  `Image storage is not configured: set ${missingR2Vars().join(', ')} in backend/.env`;

const assertStorage = (): void => {
  if (!isR2Enabled()) throw new Error(mediaStorageNotConfiguredMessage());
};

/**
 * Resize to fit the max box and re-encode as a progressive mozjpeg. Throws on
 * anything that isn't a decodable image. Used where a caller wants a small
 * JPEG before deciding where it goes (chat images).
 */
export const compressImageForUpload = async (
  input: Buffer,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<Buffer> => {
  const { maxWidth = 1920, maxHeight = 1920, quality = 82 } = options;
  if (!Buffer.isBuffer(input) || input.length === 0) {
    throw new Error('Empty or invalid image buffer');
  }
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .toBuffer();
};

const toUploadResult = (stored: StoredImage): MediaUploadResult => ({
  url: stored.url,
  publicId: stored.key,
  width: stored.width,
  height: stored.height,
  format: stored.format,
  bytes: stored.bytes,
});

/** The id fields of an upload, as the R2 key builder wants them. */
const keyContextOf = (options: Partial<UploadOptions> & MediaKeyContext): MediaKeyContext => ({
  userId: options.userId,
  userName: options.userName,
  propertyId: options.propertyId,
  propertyTitle: options.propertyTitle,
  propertyRef: options.propertyRef,
  agencyId: options.agencyId,
  agencyName: options.agencyName,
  developmentId: options.developmentId,
  developmentName: options.developmentName,
  businessListingId: options.businessListingId,
  businessName: options.businessName,
  credentialId: options.credentialId,
  conversationId: options.conversationId,
  country: options.country,
  city: options.city,
  sourceSlug: options.sourceSlug,
  sourceListingId: options.sourceListingId,
});

/**
 * Store an image that isn't one of the user-upload types — chat images, city
 * photos, news covers, site content.
 */
export const uploadMedia = async (
  buffer: Buffer,
  kind: MediaAssetKind,
  context: MediaKeyContext,
  master: MasterOptions = {}
): Promise<MediaUploadResult> => {
  assertStorage();
  return toUploadResult(await storeImage(buffer, { kind, context: keyContextOf(context), master }));
};

/**
 * Upload an image: generates every size, stores it in R2 and registers the
 * owner in FileRecord (access control).
 */
export const uploadImage = async (fileBuffer: Buffer, options: UploadOptions): Promise<MediaUploadResult> => {
  const { userId, propertyId, type, maxWidth = 1920, maxHeight = 1080, preserveQuality = false } = options;
  assertStorage();

  const stored = await storeImage(fileBuffer, {
    kind: type,
    context: keyContextOf(options),
    master: { maxWidth, maxHeight, preserveQuality },
    // Listing-form uploads arrive before the listing exists; they are drafts
    // until organizeListingMedia files them under the listing.
    status: (type === 'property' || type === 'floorplan') && !propertyId ? 'draft' : 'active',
  });

  if (!options.skipRegistration) {
    await registerFileUpload({
      publicId: stored.key,
      url: stored.url,
      userId,
      fileType: type,
      resourceId: propertyId,
      mimeType: 'image/jpeg',
      bytes: stored.bytes,
    });
  }
  return toUploadResult(stored);
};

/**
 * Upload multiple images for a property listing.
 * If watermarkOptions is provided, applies agency logo + BalkanEstate branding.
 */
export const uploadPropertyImages = async (
  files: Express.Multer.File[],
  userId: string,
  propertyId?: string,
  watermarkOptions?: WatermarkOptions,
  propertyTitle?: string
): Promise<Array<{ url: string; publicId: string; tag: string }>> => {
  const uploadedImages: Array<{ url: string; publicId: string; tag: string }> = [];

  mediaLogger.info(`📤 Uploading ${files.length} images for user ${userId}${propertyId ? `, property ${propertyId}` : ''}${watermarkOptions ? ' (with watermark)' : ''}`);

  for (const file of files) {
    try {
      let buffer = file.buffer;
      if (watermarkOptions) {
        buffer = await applyWatermark(buffer, watermarkOptions);
      }

      const result = await uploadImage(buffer, {
        userId,
        propertyId,
        propertyTitle,
        type: 'property',
        maxWidth: 1920,
        maxHeight: 1080,
      });

      uploadedImages.push({ url: result.url, publicId: result.publicId, tag: 'other' });
    } catch (error: any) {
      mediaLogger.error(`⚠️  Failed to upload image: ${error.message}`);
      // Continue with other images even if one fails
    }
  }

  mediaLogger.info(`✅ Successfully uploaded ${uploadedImages.length}/${files.length} images`);
  return uploadedImages;
};

/** Where an external feed image came from, for its folder. */
export interface ExternalImageContext {
  /** The ListingSource slug the image came from. */
  sourceSlug?: string;
  /** Stable per-source listing id (e.g. sourceListingId) for the listing folder. */
  listingId?: string;
}

const MAX_REMOTE_IMAGE_BYTES = 25 * 1024 * 1024;

/** Fetch a remote image with a timeout and a size cap. */
export const downloadImage = async (url: string, timeoutMs = 20_000): Promise<Buffer> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  if (!res.ok) throw new Error(`Image download failed: HTTP ${res.status}`);
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > MAX_REMOTE_IMAGE_BYTES) throw new Error(`Image too large (${declared} bytes)`);
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_REMOTE_IMAGE_BYTES) throw new Error(`Image too large (${buffer.length} bytes)`);
  return buffer;
};

/**
 * Re-host an external feed image: external/{source}/{listingId}/{photoId}.
 * The same source URL is only ever stored once.
 */
export const uploadFromUrl = async (
  remoteUrl: string,
  context: ExternalImageContext = {}
): Promise<MediaUploadResult> => {
  // In local/development we never re-host external images — that would fill
  // the bucket with throwaway dev data. Reference the source URL instead.
  if (process.env.NODE_ENV !== 'production') {
    mediaLogger.info(`⏭️  [dev] Skipping re-host, referencing source: ${remoteUrl}`);
    return { url: remoteUrl, publicId: '', width: 0, height: 0, format: '', bytes: 0 };
  }
  assertStorage();

  const existing = await MediaAsset.findOne({ 'source.url': remoteUrl });
  if (existing) {
    return {
      url: storedUrlFor(existing.key, existing.bucket),
      publicId: existing.key,
      width: existing.width,
      height: existing.height,
      format: 'jpg',
      bytes: existing.bytes,
    };
  }

  const buffer = await downloadImage(remoteUrl);
  const stored = await storeImage(buffer, {
    kind: 'external',
    context: { sourceSlug: context.sourceSlug, sourceListingId: context.listingId },
    master: { maxWidth: 1920, maxHeight: 1920 },
    source: { url: remoteUrl },
  });
  mediaLogger.info(`✅ Re-hosted external image: ${stored.key}`);
  return toUploadResult(stored);
};

/**
 * Delete an image and its file record. Never throws: a failed cleanup must
 * not fail the operation that triggered it.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  if (!publicId) return;
  try {
    await deleteKeys([publicId]);
    await removeFileRecord(publicId);
    mediaLogger.info(`🗑️  Deleted image: ${publicId}`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete image ${publicId}:`, error.message);
  }
};

/** Delete multiple images and their file records. Never throws. */
export const deleteImages = async (publicIds: string[]): Promise<void> => {
  const ids = [...new Set((publicIds || []).filter(Boolean))];
  if (ids.length === 0) return;
  try {
    await deleteKeys(ids);
  } catch (error: any) {
    mediaLogger.error(`❌ Batch delete error:`, error.message);
  }
  await Promise.all(ids.map((id) => removeFileRecord(id).catch(() => undefined)));
  mediaLogger.info(`🗑️  Deleted ${ids.length} images`);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Delete every photo under a key prefix (folder). `keep` keys survive. Never throws. */
export const deleteFolder = async (folderPath: string, keep: ReadonlySet<string> = new Set()): Promise<void> => {
  try {
    const count = await deleteWhere({ key: { $regex: `^${escapeRegex(folderPath)}` } }, [...keep]);
    mediaLogger.info(`🗑️  Deleted folder ${folderPath} (${count} photos)`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete folder ${folderPath}:`, error.message);
  }
};

/** A listing image as stored on the Property document. */
export interface ListingImageRef {
  url: string;
  publicId?: string;
  tag?: 'main' | 'floorplan' | 'other' | string;
}

/**
 * File a listing's draft photos under the listing once it exists:
 *
 *   users/{userId}/listings/drafts/photos/{id}
 *   →  users/{userId}/listings/{propertyId}/photos|floorplans/{id}
 *
 * External URLs (no publicId) are left as they are. Each move is
 * best-effort — on failure the original ref is kept (and still linked to the
 * listing) so a listing never loses its image and cleanup still finds it.
 */
export const organizeListingMedia = async (
  images: ListingImageRef[],
  userId: string,
  propertyId: string,
  propertyTitle?: string
): Promise<ListingImageRef[]> => {
  const names = await resolveMediaNames({ userId, propertyId, propertyTitle });
  // Dedupe moves — the main image often shares a publicId with images[0].
  const moved = new Map<string, { url: string; publicId: string }>();
  const out: ListingImageRef[] = [];

  for (const img of images) {
    const publicId = img.publicId;
    const asset = publicId ? await MediaAsset.findOne({ key: publicId }) : null;
    if (!publicId || !asset) {
      out.push(img); // external URL, or not one of ours
      continue;
    }

    const cached = moved.get(publicId);
    if (cached) {
      out.push({ ...img, ...cached });
      continue;
    }

    const isFloorplan = img.tag === 'floorplan';
    const fileType = isFloorplan ? 'floorplan' : 'property';
    try {
      const folder = listingMediaFolder(names, isFloorplan ? 'floorplans' : 'photos');
      const stored = await moveAsset(asset, folder, {
        status: 'active',
        kind: fileType,
        propertyId: new mongoose.Types.ObjectId(propertyId),
      });
      if (stored.key !== publicId) {
        await removeFileRecord(publicId);
        await registerFileUpload({ publicId: stored.key, url: stored.url, userId, fileType, resourceId: propertyId });
      }
      const ref = { url: stored.url, publicId: stored.key };
      moved.set(publicId, ref);
      out.push({ ...img, ...ref });
    } catch (error: any) {
      mediaLogger.error(`⚠️  Failed to file photo ${publicId} under listing ${propertyId}:`, error.message);
      await MediaAsset.updateOne({ key: publicId }, { status: 'active', propertyId }).catch(() => undefined);
      out.push(img);
    }
  }

  return out;
};

/**
 * Delete every photo of one listing (photos and floor plans), plus any
 * explicit public ids the caller still holds.
 *
 * `keepPublicIds` survives — the archive keeps one thumbnail of a deleted
 * listing until the retention job clears it.
 */
export const deleteListingMedia = async (
  userId: string,
  propertyId: string,
  options: { publicIds?: string[]; keepPublicIds?: string[] } = {}
): Promise<void> => {
  const keep = new Set((options.keepPublicIds || []).filter(Boolean));
  try {
    await deleteWhere({ propertyId }, [...keep]);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete photos of listing ${propertyId}:`, error.message);
  }
  // Anything left in the listing's folder, whatever name it was filed under.
  try {
    await deleteWhere(
      { key: { $regex: `^users/[^/]+/listings/([^/]*_)?${escapeRegex(propertyId)}/` } },
      [...keep]
    );
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to sweep the folder of listing ${propertyId}:`, error.message);
  }

  const remaining = (options.publicIds || []).filter((id) => id && !keep.has(id));
  if (remaining.length > 0) await deleteImages(remaining);
};

/**
 * Delete a user's personal files — avatar and verification documents.
 * Used when an account is closed; listing media is handled with the listings.
 */
export const deleteUserPersonalMedia = async (userId: string): Promise<void> => {
  try {
    await deleteWhere({ ownerId: userId, kind: { $in: ['avatar', 'license', 'credential'] } });
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete personal files of ${userId}:`, error.message);
  }

  // Anything only the access-control records still know about.
  const personal: string[] = [];
  for (const fileType of ['avatar', 'license', 'credential'] as const) {
    try {
      const { files } = await getUserFiles(userId, fileType, 1, 500);
      personal.push(...files.map((f) => f.publicId));
    } catch (error: any) {
      mediaLogger.warn(`⚠️  Could not list ${fileType} files for ${userId}: ${error.message}`);
    }
  }
  await deleteImages(personal);
};

/** Delete an agency's logo and cover. Never throws. */
export const deleteAgencyMedia = async (agencyId: string): Promise<void> => {
  try {
    await deleteWhere({ agencyId });
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete media of agency ${agencyId}:`, error.message);
  }
};

/** Of `candidates`, the publicIds no Property references any more. */
const unreferencedByListings = async (candidates: string[]): Promise<{ orphans: string[]; inUse: string[] }> => {
  // Lazy import keeps this service free of a model dependency at load time.
  const { default: Property } = await import('../models/Property');
  const inUse = new Set<string>();
  for (let i = 0; i < candidates.length; i += 100) {
    const batch = candidates.slice(i, i + 100);
    const docs = await Property.find({
      $or: [
        { 'images.publicId': { $in: batch } },
        { 'floorplans.publicId': { $in: batch } },
        { imagePublicId: { $in: batch } },
        { floorplanPublicId: { $in: batch } },
      ],
    }).select('images.publicId floorplans.publicId imagePublicId floorplanPublicId').lean();
    for (const d of docs as any[]) {
      [d.imagePublicId, d.floorplanPublicId, ...(d.images || []).map((x: any) => x.publicId), ...(d.floorplans || []).map((x: any) => x.publicId)]
        .filter(Boolean)
        .forEach((id: string) => inUse.add(id));
    }
  }
  return { orphans: candidates.filter((id) => !inUse.has(id)), inUse: [...inUse] };
};

/**
 * Sweep listing photos that were uploaded but never attached to a listing.
 *
 * The listing form uploads photos as drafts before the property exists; if
 * the seller abandons the form they would stay in storage forever. This
 * deletes drafts older than `maxAgeHours` that no Property references (a
 * failed move on create can leave a live listing pointing at a draft, so we
 * check first — those are marked active instead).
 */
export const cleanupOrphanedTempImages = async (maxAgeHours = 48): Promise<number> => {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  const drafts = await MediaAsset.find({ status: 'draft', createdAt: { $lt: cutoff } }).select('key').lean();
  if (drafts.length === 0) return 0;

  const { orphans, inUse } = await unreferencedByListings(drafts.map((d) => d.key));
  if (inUse.length > 0) await MediaAsset.updateMany({ key: { $in: inUse } }, { status: 'active' });
  await deleteImages(orphans);
  mediaLogger.info(`🧹 Removed ${orphans.length} abandoned draft photos (${inUse.length} still in use)`);
  return orphans.length;
};

/** True for a photo uploaded from the listing form that isn't filed under a listing yet. */
export const isUnfiledListingMedia = (publicId?: string): publicId is string => !!publicId && isDraftListingKey(publicId);
