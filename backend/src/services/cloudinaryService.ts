import { Readable } from 'stream';
import { createHash } from 'crypto';
import sharp from 'sharp';
import mongoose from 'mongoose';
import cloudinary from '../config/cloudinary';
import { mediaLogger } from '../utils/logger';
import { registerFileUpload, removeFileRecord, getUserFiles } from './storageAccessPolicy';
import { applyWatermark, WatermarkOptions } from './watermarkService';
import {
  buildMediaFolder,
  listingTag,
  mediaTags,
  agencyTag,
  MEDIA_ROOT,
  type MediaKind,
} from './media/mediaNaming';
import { resolveMediaOwner } from './media/mediaOwnerResolver';
import { isR2Enabled, isCloudinaryConfigured } from '../config/r2';
import MediaAsset, { type MediaAssetKind } from '../models/MediaAsset';
import {
  storeImage,
  deleteKeys,
  deleteWhere,
  moveAsset,
  storedUrlFor,
  type StoredImage,
} from './media/r2MediaStore';
import { listingMediaFolder, type MediaKeyContext } from './media/mediaKeys';
import type { MasterOptions } from './media/imageVariants';

/**
 * Media service — every image upload and delete in the app goes through here.
 *
 * Storage backend:
 *  - Cloudflare R2 when R2_* is configured (see config/r2.ts). Each photo is
 *    stored once with all its display sizes pre-generated (Zillow-style, see
 *    config/mediaVariants.ts) and indexed in MongoDB (models/MediaAsset.ts).
 *  - Cloudinary otherwise, and for anything not yet migrated: deletes look a
 *    key up in MediaAsset first and hand unknown ids to Cloudinary.
 *
 * Cloudinary cost optimization strategies (legacy path):
 * 1. Pre-compress images before upload using sharp (reduces storage and bandwidth)
 * 2. Use auto quality and auto format transformations (serves WebP when supported)
 * 3. Resize large images to reasonable dimensions
 * 4. Store only public_id in database (not full URLs)
 * 5. Organized folder structure for easy cleanup
 */

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload types. Where each one lands in Cloudinary is decided in one place —
 * `buildMediaFolder` in ./media/mediaNaming.ts documents the full layout
 * (users/{a-z}/{name}_{id}/…, agencies/{a-z}/…, businesses/{a-z}/…).
 */
type UploadType = Exclude<MediaKind, 'video'>;

interface UploadOptions {
  userId: string;
  /** Kept for callers that pass it; folders are named by display name now. */
  userEmail?: string;
  /** Display name for the user folder. Looked up from the id when omitted. */
  userName?: string;
  propertyId?: string;
  /** Listing title for the listing folder. Looked up from the id when omitted. */
  propertyTitle?: string;
  agencyId?: string;
  agencyName?: string;
  businessListingId?: string;
  businessName?: string;
  credentialId?: string;
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /**
   * Keep more detail in the stored master (q90, 4:4:4 chroma) for images
   * shown nearly full-bleed. Delivery still optimises per request.
   */
  preserveQuality?: boolean;
  /** Skip the ownership FileRecord (for public uploads with no real user). */
  skipRegistration?: boolean;
}

/** Limits every upload's decode: rejects decompression bombs before sharp allocates. */
const MAX_INPUT_PIXELS = 50_000_000; // ~50 MP, larger than any phone camera

/**
 * Resize to fit `maxEdge` and re-encode as a progressive mozjpeg, on our own
 * server, so Cloudinary stores a small master and never runs a billed
 * incoming transformation. Throws on anything that isn't a decodable image.
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

/**
 * Sensitive file types that require authenticated (signed URL) delivery.
 * These are private documents that should NOT be publicly accessible.
 * All other types (property, avatar, agency-logo, etc.) stay public
 * because they're rendered in <img> tags by unauthenticated visitors.
 */
const SENSITIVE_TYPES: ReadonlySet<UploadType> = new Set(['license', 'credential']);

const toUploadResult = (stored: StoredImage): CloudinaryUploadResult => ({
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
  propertyId: options.propertyId,
  agencyId: options.agencyId,
  businessListingId: options.businessListingId,
  credentialId: options.credentialId,
  conversationId: options.conversationId,
  country: options.country,
  city: options.city,
  sourceSlug: options.sourceSlug,
  sourceListingId: options.sourceListingId,
});

const storeMediaBuffer = (
  buffer: Buffer,
  kind: MediaAssetKind,
  context: Partial<UploadOptions> & MediaKeyContext,
  extra: { master?: MasterOptions; status?: 'draft' | 'active'; key?: string; source?: { url?: string } } = {}
): Promise<StoredImage> => storeImage(buffer, { kind, context: keyContextOf(context), ...extra });

/**
 * Store an image that isn't one of the user-upload types above — chat
 * images, city photos, news covers, site content. R2 only: callers keep their
 * Cloudinary code path for when R2 isn't configured.
 */
export const uploadMedia = async (
  buffer: Buffer,
  kind: MediaAssetKind,
  context: MediaKeyContext,
  master: MasterOptions = {}
): Promise<CloudinaryUploadResult> => toUploadResult(await storeMediaBuffer(buffer, kind, context, { master }));

export { isR2Enabled };

/**
 * Upload image to Cloudinary with optimization
 *
 * Folder layout and tags come from ./media/mediaNaming.ts
 */
export const uploadImage = async (
  fileBuffer: Buffer,
  options: UploadOptions
): Promise<CloudinaryUploadResult> => {
  const {
    userId,
    propertyId,
    type,
    maxWidth = 1920,
    maxHeight = 1080,
    preserveQuality = false,
    // Note: quality parameter not used - using fixed values (82/90) tuned for size
  } = options;

  if (isR2Enabled()) {
    const stored = await storeMediaBuffer(fileBuffer, type, options, {
      master: { maxWidth, maxHeight, preserveQuality },
      // Listing-form uploads arrive before the listing exists; they are
      // drafts until organizeListingMedia files them under the listing.
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
  }

  try {
    // Step 1: Light processing using sharp (frontend already compresses)
    // Just ensure correct format and basic optimization
    // Images are already compressed on frontend, so minimal processing needed
    // Every upload is resized to fit the max box and re-encoded here, for
    // free, so Cloudinary never has to run a billed incoming transformation
    // and the stored master stays small (storage is billed per GB too).
    if (!Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      throw new Error('Empty or invalid image buffer');
    }

    const imageMetadata = await sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!imageMetadata.width || !imageMetadata.height) {
      throw new Error('File is not a readable image');
    }
    mediaLogger.info(`⚡ Processing image: ${imageMetadata.width}x${imageMetadata.height} -> max ${maxWidth}x${maxHeight}`);

    const processedBuffer: Buffer = await sharp(fileBuffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // honour EXIF orientation before the metadata is dropped
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        // 4:4:4 keeps full colour resolution for images shown large —
        // JPEG's default 4:2:0 halves the chroma and shows up as coloured
        // fringing along hard edges once the picture fills the screen.
        quality: preserveQuality ? 90 : 82,
        ...(preserveQuality ? { chromaSubsampling: '4:4:4' } : {}),
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer();

    const compressedBuffer = processedBuffer;

    // Step 2: Readable A–Z folder + id tags (tags are what cleanup deletes by)
    const owner = await resolveMediaOwner(type, options);
    const folder = buildMediaFolder(type, owner);
    const tags = mediaTags(type, owner);

    // Step 3: Upload to Cloudinary with optimizations
    // Sensitive documents (license, credential) use authenticated delivery (requires signed URL).
    // Public assets (property photos, avatars, logos) use standard upload so they render
    // in <img> tags without authentication — buyers browse listings without logging in.
    const deliveryType = SENSITIVE_TYPES.has(type) ? 'authenticated' : 'upload';
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          tags,
          resource_type: 'image',
          type: deliveryType,
          // No incoming `transformation` here: sharp above already sized and
          // compressed the master, and an incoming transformation would be
          // billed on every upload. Delivery applies f_auto/q_auto per request
          // via `optimizeCloudinaryUrl`, so nothing is served unoptimised.
          // Add metadata for better organization
          context: {
            type,
            user_id: userId,
            ...(propertyId && { property_id: propertyId }),
          },
          // No eager transformations: they pre-generated sizes the frontend
          // never requests (it builds its own f_auto,q_auto,w_… URLs), so
          // each upload paid for two derivatives nobody downloaded.
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      const readableStream = new Readable();
      readableStream.push(compressedBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    mediaLogger.info(`✅ Uploaded image to Cloudinary: ${result.public_id} (${Math.round(result.bytes / 1024)}KB)`);

    // Step 4: Register file in storage access policy (ownership tracking).
    // Skipped for public uploads (e.g. advertising creatives) that have no user.
    if (!options.skipRegistration) {
      await registerFileUpload({
        publicId: result.public_id,
        url: result.secure_url,
        userId,
        fileType: type,
        resourceId: propertyId,
        mimeType: `image/${result.format}`,
        bytes: result.bytes,
      });
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error: any) {
    mediaLogger.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
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
      // Apply watermark before upload if options provided
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
        quality: 85,
      });

      uploadedImages.push({
        url: result.url,
        publicId: result.publicId,
        tag: 'other', // Can be customized based on file metadata or user input
      });
    } catch (error: any) {
      mediaLogger.error(`⚠️  Failed to upload image: ${error.message}`);
      // Continue with other images even if one fails
    }
  }

  mediaLogger.info(`✅ Successfully uploaded ${uploadedImages.length}/${files.length} images`);

  return uploadedImages;
};

/**
 * Context for re-hosting an external feed image. Feed images live in their own
 * tree, apart from anything a user uploaded, so they can be audited or wiped
 * per source in one go:
 *   balkan-estate/external-feeds/{sourceSlug}/{listingId}
 */
export interface ExternalImageContext {
  /** The ListingSource slug the image came from. */
  sourceSlug?: string;
  /** Stable per-source listing id (e.g. sourceListingId) for the listing folder. */
  listingId?: string;
}

/** Keep a folder segment to characters Cloudinary accepts in a public_id. */
const safeSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);

/** Root folder for every image that came from an external feed. */
export const EXTERNAL_FEEDS_FOLDER = 'balkan-estate/external-feeds';

const buildExternalFolder = (ctx: ExternalImageContext): string => {
  const source = safeSegment(ctx.sourceSlug || 'unknown-source');
  // ID only (no title slug): the folder is part of the public_id, and a
  // title edited at the source would otherwise re-upload every photo.
  const listing = ctx.listingId ? `/${safeSegment(ctx.listingId)}` : '';
  return `${EXTERNAL_FEEDS_FOLDER}/${source}${listing}`;
};

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
 * Upload an image directly from a remote URL.
 * Used by the universal-listings ingest pipeline to re-host external images
 * onto Cloudinary so frontend image optimization (srcset / WebP) keeps working
 * and source sites can't break our listings by deleting images later.
 *
 * Cloudinary's `uploader.upload(remoteUrl)` accepts http(s) URLs natively.
 */
export const uploadFromUrl = async (
  remoteUrl: string,
  context: ExternalImageContext = {}
): Promise<CloudinaryUploadResult> => {
  // In local/development we NEVER upload external images to Cloudinary — that
  // would consume storage/quota for throwaway dev data. Always reference the
  // source URL directly instead of re-hosting it.
  if (process.env.NODE_ENV !== 'production') {
    mediaLogger.info(`⏭️  [dev] Skipping Cloudinary re-host, referencing source: ${remoteUrl}`);
    return {
      url: remoteUrl,
      publicId: '',
      width: 0,
      height: 0,
      format: '',
      bytes: 0,
    };
  }

  // The ingest job re-normalizes existing listings on every run. A public_id
  // derived from the source URL plus `overwrite: false` makes a repeat upload
  // resolve to the asset we already have instead of storing another copy.
  const publicId = createHash('sha1').update(remoteUrl).digest('hex').slice(0, 20);

  if (isR2Enabled()) {
    const existing = await MediaAsset.findOne({ 'source.url': remoteUrl });
    if (existing) {
      return { url: storedUrlFor(existing.key, existing.bucket), publicId: existing.key, width: existing.width, height: existing.height, format: 'jpg', bytes: existing.bytes };
    }
    const buffer = await downloadImage(remoteUrl);
    const stored = await storeMediaBuffer(
      buffer,
      'external',
      { sourceSlug: context.sourceSlug, sourceListingId: context.listingId },
      { master: { maxWidth: 1920, maxHeight: 1920 }, source: { url: remoteUrl } }
    );
    return toUploadResult(stored);
  }

  const result = await cloudinary.uploader.upload(remoteUrl, {
    folder: buildExternalFolder(context),
    public_id: publicId,
    overwrite: false,
    resource_type: 'image',
    // Scraped photos are often huge; cap the stored master like our own uploads.
    transformation: [
      { width: 1920, height: 1920, crop: 'limit', quality: 'auto:good' },
    ],
  });
  mediaLogger.info(`✅ Re-hosted external image to Cloudinary: ${result.public_id}`);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
};

/**
 * Delete an image — from R2 when it's ours, otherwise from Cloudinary — and
 * remove its file record. Never throws: a failed cleanup must not fail the
 * operation that triggered it.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  if (!publicId) return;
  try {
    const ours = await deleteKeys([publicId]);
    if (!ours.has(publicId) && isCloudinaryConfigured()) {
      // Try the standard upload type first (most files are public)
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result === 'not found') {
        // May be an authenticated resource (license/credential)
        await cloudinary.uploader.destroy(publicId, { type: 'authenticated' });
      }
    }
    await removeFileRecord(publicId);
    mediaLogger.info(`🗑️  Deleted image: ${publicId}`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete image ${publicId}:`, error.message);
  }
};

/** Delete multiple images (R2 and/or Cloudinary) and remove their file records. */
export const deleteImages = async (publicIds: string[]): Promise<void> => {
  const ids = [...new Set((publicIds || []).filter(Boolean))];
  if (ids.length === 0) return;

  mediaLogger.info(`🗑️  Deleting ${ids.length} images...`);

  let legacy = ids;
  try {
    const ours = await deleteKeys(ids);
    legacy = ids.filter((id) => !ours.has(id));
  } catch (error: any) {
    mediaLogger.error(`❌ R2 batch delete error:`, error.message);
  }

  if (legacy.length > 0 && isCloudinaryConfigured()) {
    try {
      // Cloudinary allows batch deletion (100 per call) — try both delivery types
      for (let i = 0; i < legacy.length; i += 100) {
        const batch = legacy.slice(i, i + 100);
        const uploadResult = await cloudinary.api.delete_resources(batch);
        const notDeleted = Object.entries(uploadResult.deleted)
          .filter(([, status]) => status === 'not_found')
          .map(([id]) => id);
        if (notDeleted.length > 0) {
          await cloudinary.api.delete_resources(notDeleted, { type: 'authenticated' });
        }
      }
    } catch (error: any) {
      mediaLogger.error(`❌ Cloudinary batch delete error:`, error.message);
      for (const id of legacy) {
        await cloudinary.uploader.destroy(id).catch(() => undefined);
      }
    }
  }

  await Promise.all(ids.map((id) => removeFileRecord(id).catch(() => undefined)));
  mediaLogger.info(`✅ Deleted ${ids.length} images`);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every Cloudinary public id under a prefix, both delivery types. */
const listCloudinaryPrefix = async (prefix: string): Promise<string[]> => {
  const ids = new Set<string>();
  for (const type of ['authenticated', 'upload'] as const) {
    let cursor: string | undefined;
    do {
      const page: any = await cloudinary.api
        .resources({ type, prefix, max_results: 500, ...(cursor ? { next_cursor: cursor } : {}) })
        .catch(() => ({ resources: [] }));
      for (const r of page.resources || []) ids.add(r.public_id);
      cursor = page.next_cursor;
    } while (cursor);
  }
  return [...ids];
};

/**
 * Delete all images under a folder/key prefix, in R2 and Cloudinary.
 * `keep` ids survive the sweep.
 */
export const deleteFolder = async (folderPath: string, keep: ReadonlySet<string> = new Set()): Promise<void> => {
  try {
    mediaLogger.info(`🗑️  Deleting folder: ${folderPath}`);
    const r2Count = await deleteWhere({ key: { $regex: `^${escapeRegex(folderPath)}` } }, [...keep]);

    let cloudinaryCount = 0;
    if (isCloudinaryConfigured()) {
      const ids = (await listCloudinaryPrefix(folderPath)).filter((id) => !keep.has(id));
      cloudinaryCount = ids.length;
      if (ids.length) await deleteImages(ids);
    }
    mediaLogger.info(`✅ Deleted folder: ${folderPath} (${r2Count} R2 photos, ${cloudinaryCount} Cloudinary files)`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete folder ${folderPath}:`, error.message);
  }
};

/** The MediaAsset filter equivalent of a Cloudinary cleanup tag (see mediaNaming). */
export const tagToAssetFilter = (tag: string): Record<string, unknown> | null => {
  const match = tag.match(/^(owner|listing|agency|business|kind)_(.+)$/);
  if (!match) return null;
  const [, prefix, value] = match;
  const isObjectId = /^[a-f0-9]{24}$/i.test(value);
  switch (prefix) {
    case 'owner':
      return isObjectId ? { ownerId: value } : null;
    case 'listing':
      return isObjectId ? { propertyId: value } : null;
    case 'agency':
      return isObjectId ? { agencyId: value } : null;
    case 'business':
      return isObjectId ? { businessListingId: value } : null;
    case 'kind':
      return { kind: value };
    default:
      return null;
  }
};

/**
 * Delete every asset carrying `tag` — in R2 via the MediaAsset index (tags
 * map onto its owner/listing/agency/business fields) and in Cloudinary across
 * images/videos and both delivery types.
 */
export const deleteByTag = async (tag: string, keepKeys: string[] = []): Promise<void> => {
  const filter = tagToAssetFilter(tag);
  if (filter) {
    try {
      await deleteWhere(filter, keepKeys);
    } catch (error: any) {
      mediaLogger.error(`❌ Failed to delete R2 photos tagged ${tag}:`, error.message);
    }
  }

  if (!isCloudinaryConfigured()) return;
  const targets = [
    { resource_type: 'image', type: 'upload' },
    { resource_type: 'image', type: 'authenticated' },
    { resource_type: 'video', type: 'upload' },
  ] as const;

  for (const target of targets) {
    try {
      // Deletes up to 1000 per call and reports `partial` when more remain.
      let partial = true;
      let guard = 0;
      while (partial && guard++ < 50) {
        const result: any = await cloudinary.api.delete_resources_by_tag(tag, { ...target });
        partial = Boolean(result?.partial);
      }
    } catch (error: any) {
      mediaLogger.error(`❌ Failed to delete ${target.resource_type}/${target.type} tagged ${tag}:`, error.message);
    }
  }
  mediaLogger.info(`🗑️  Deleted assets tagged ${tag}`);
};

/** Add a tag to already-uploaded Cloudinary assets (e.g. temp uploads once their listing exists). */
const addTag = async (tag: string, publicIds: string[]): Promise<void> => {
  if (publicIds.length === 0 || !isCloudinaryConfigured()) return;
  try {
    for (let i = 0; i < publicIds.length; i += 1000) {
      await cloudinary.uploader.add_tag(tag, publicIds.slice(i, i + 1000));
    }
  } catch (error: any) {
    mediaLogger.warn(`⚠️  Could not tag ${publicIds.length} assets with ${tag}: ${error.message}`);
  }
};

/** A listing image as stored on the Property document. */
export interface ListingImageRef {
  url: string;
  publicId?: string;
  tag?: 'main' | 'floorplan' | 'other' | string;
}

/**
 * File a listing's freshly-uploaded photos under the listing, once it exists:
 *
 *   R2:         users/{userId}/listings/drafts/photos/{id}
 *            →  users/{userId}/listings/{propertyId}/photos/{id}
 *   Cloudinary: balkan-estate/users/{a-z}/{user-name}_{userId}/listings/temp
 *            →  …/listings/{title}_{propertyId}/photos|floorplans
 *
 * The frontend uploads images before the property exists (as drafts), so this
 * runs right after the property is created. External URLs (no publicId) and
 * photos already filed are left as they are. Each move is best-effort — on
 * failure the original ref is kept (and still linked to the listing) so a
 * listing never loses its image and cleanup still finds it.
 */
export const organizeListingMedia = async (
  images: ListingImageRef[],
  userId: string,
  propertyId: string,
  propertyTitle?: string
): Promise<ListingImageRef[]> => {
  // Dedupe moves — the main image often shares a publicId with images[0].
  const movedByPublicId = new Map<string, { url: string; publicId: string }>();
  const toTag: string[] = [];
  let owner: Awaited<ReturnType<typeof resolveMediaOwner>> | undefined;

  const out: ListingImageRef[] = [];
  for (const img of images) {
    const publicId = img.publicId;
    if (!publicId) {
      out.push(img); // external URL — leave as-is
      continue;
    }

    const cached = movedByPublicId.get(publicId);
    if (cached) {
      out.push({ ...img, url: cached.url, publicId: cached.publicId });
      continue;
    }

    const isFloorplan = img.tag === 'floorplan';
    const fileType = isFloorplan ? 'floorplan' : 'property';

    // R2 photo: move drafts into the listing folder, link it to the listing.
    const asset = await MediaAsset.findOne({ key: publicId });
    if (asset) {
      try {
        const folder = listingMediaFolder(userId, propertyId, isFloorplan ? 'floorplans' : 'photos');
        const stored = await moveAsset(asset, folder, {
          status: 'active',
          kind: fileType,
          propertyId: new mongoose.Types.ObjectId(propertyId),
        });
        if (stored.key !== publicId) {
          await removeFileRecord(publicId);
          await registerFileUpload({ publicId: stored.key, url: stored.url, userId, fileType, resourceId: propertyId });
        }
        movedByPublicId.set(publicId, { url: stored.url, publicId: stored.key });
        out.push({ ...img, url: stored.url, publicId: stored.key });
      } catch (error: any) {
        mediaLogger.error(`⚠️  Failed to file R2 photo ${publicId} under listing ${propertyId}:`, error.message);
        await MediaAsset.updateOne({ key: publicId }, { status: 'active', propertyId }).catch(() => undefined);
        out.push(img);
      }
      continue;
    }

    if (!publicId.includes('/listings/temp') || !isCloudinaryConfigured()) {
      out.push(img); // already organized — leave as-is
      continue;
    }

    owner = owner ?? (await resolveMediaOwner('property', { userId, propertyId, propertyTitle }));
    const folder = buildMediaFolder(fileType, owner);
    const filename = publicId.split('/').pop();
    const newPublicId = `${folder}/${filename}`;

    try {
      const result = await cloudinary.uploader.rename(publicId, newPublicId, {
        overwrite: false,
        invalidate: true,
      });
      await removeFileRecord(publicId);
      await registerFileUpload({
        publicId: result.public_id,
        url: result.secure_url,
        userId,
        fileType,
        resourceId: propertyId,
      });
      movedByPublicId.set(publicId, { url: result.secure_url, publicId: result.public_id });
      toTag.push(result.public_id);
      out.push({ ...img, url: result.secure_url, publicId: result.public_id });
      mediaLogger.info(`📁 Organized listing image: ${publicId} → ${result.public_id}`);
    } catch (error: any) {
      mediaLogger.error(`⚠️  Failed to organize image ${publicId}:`, error.message);
      toTag.push(publicId);
      out.push(img); // keep original on failure
    }
  }

  // Temp uploads had no listing id yet; tag them now so listing cleanup finds them.
  await addTag(listingTag(propertyId), toTag);

  return out;
};

/**
 * Get optimized Cloudinary image URL with transformations (legacy assets).
 * Uses signed URL for sensitive file types, standard URL for public assets.
 * This doesn't require a new request to Cloudinary - just builds the URL.
 */
export const getOptimizedUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    sensitive?: boolean;
  } = {}
): string => {
  const { width, height, crop = 'fill', quality = 'auto:good', sensitive = false } = options;

  return cloudinary.url(publicId, {
    ...(sensitive ? { type: 'authenticated', sign_url: true } : {}),
    transformation: [
      ...(width && height ? [{ width, height, crop }] : []),
      { quality },
      { fetch_format: 'auto' },
    ],
    secure: true,
  });
};

/**
 * Delete every media file of one listing: photos, floor plans and the
 * generated video. R2 goes by the listing id in MediaAsset (plus its folder);
 * Cloudinary goes by tag, then sweeps the folder layouts used before tagging
 * existed. Then any explicit public ids the caller still holds.
 *
 * `keepPublicIds` survives the sweep — the archive keeps one thumbnail of a
 * deleted listing until the retention job clears it.
 */
export const deleteListingMedia = async (
  userId: string,
  propertyId: string,
  options: { publicIds?: string[]; videoPublicIds?: string[]; keepPublicIds?: string[] } = {}
): Promise<void> => {
  const keep = new Set((options.keepPublicIds || []).filter(Boolean));

  try {
    await deleteWhere({ propertyId }, [...keep]);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete R2 photos of listing ${propertyId}:`, error.message);
  }
  await deleteFolder(listingMediaFolder(userId, propertyId, 'photos').replace(/\/photos$/, '/'), keep);

  const remaining = (options.publicIds || []).filter((id) => id && !keep.has(id));

  if (isCloudinaryConfigured()) {
    if (keep.size > 0) {
      // Untag the keepers so the tag sweep leaves them alone.
      try {
        await cloudinary.uploader.remove_tag(listingTag(propertyId), [...keep]);
      } catch (error: any) {
        mediaLogger.warn(`⚠️  Could not untag kept files for ${propertyId}: ${error.message}`);
      }
    }

    await deleteByTag(listingTag(propertyId), [...keep]);

    // Layouts from before tags: users/{userId}/listings/{propertyId}… and properties/user-…
    for (const prefix of [
      `${MEDIA_ROOT}/users/${userId}/listings/${propertyId}`,
      `${MEDIA_ROOT}/properties/user-${userId}/listing-${propertyId}`,
    ]) {
      await deleteFolder(prefix, keep);
    }

    // Generated showcase videos, including ones uploaded before tagging.
    for (const videoId of [
      ...(options.videoPublicIds || []),
      `${MEDIA_ROOT}/users/${userId}/listings/${propertyId}/videos/showcase`,
    ]) {
      await cloudinary.uploader.destroy(videoId, { resource_type: 'video' }).catch(() => undefined);
    }
  }

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
    mediaLogger.error(`❌ Failed to delete R2 personal files of ${userId}:`, error.message);
  }

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

  if (isCloudinaryConfigured()) {
    // Layout from before tagging.
    await deleteFolder(`${MEDIA_ROOT}/users/${userId}/avatar`);
    await deleteFolder(`${MEDIA_ROOT}/users/${userId}/documents`);
  }
};

/** Delete an agency's logo and cover. */
export const deleteAgencyMedia = async (agencyId: string): Promise<void> => {
  await deleteByTag(agencyTag(agencyId));
  if (isCloudinaryConfigured()) await deleteFolder(`${MEDIA_ROOT}/agencies/${agencyId}/`);
};

/** Of `candidates`, the publicIds no Property references any more. */
const unreferencedByListings = async (candidates: string[]): Promise<{ orphans: string[]; inUse: number }> => {
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
  return { orphans: candidates.filter((id) => !inUse.has(id)), inUse: inUse.size };
};

/**
 * Sweep listing photos that were uploaded but never attached to a listing.
 *
 * The listing form uploads photos before the property exists (R2 drafts /
 * Cloudinary `.../listings/temp`); if the seller abandons the form, those
 * files would stay in storage and be billed forever. This deletes drafts
 * older than `maxAgeHours` that no Property still references (a failed move
 * on create can leave a live listing pointing at a draft, so we check first).
 */
export const cleanupOrphanedTempImages = async (maxAgeHours = 48): Promise<number> => {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  let removed = 0;

  // R2 drafts, straight from the MediaAsset index.
  const drafts = await MediaAsset.find({ status: 'draft', createdAt: { $lt: cutoff } }).select('key').lean();
  if (drafts.length > 0) {
    const { orphans, inUse } = await unreferencedByListings(drafts.map((d) => d.key));
    if (inUse > 0) await MediaAsset.updateMany({ key: { $in: drafts.map((d) => d.key).filter((k) => !orphans.includes(k)) } }, { status: 'active' });
    await deleteImages(orphans);
    removed += orphans.length;
    mediaLogger.info(`🧹 Removed ${orphans.length} abandoned R2 draft photos (${inUse} still in use)`);
  }

  if (!isCloudinaryConfigured()) return removed;

  // Cloudinary temp uploads (Admin API — rate-limited, but not billed as credits).
  const candidates: string[] = [];
  let cursor: string | undefined;
  do {
    const page: any = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'balkan-estate/users/',
      max_results: 500,
      ...(cursor ? { next_cursor: cursor } : {}),
    });
    for (const r of page.resources || []) {
      if (r.public_id.includes('/listings/temp/') && new Date(r.created_at).getTime() < cutoff.getTime()) {
        candidates.push(r.public_id);
      }
    }
    cursor = page.next_cursor;
  } while (cursor);

  if (candidates.length === 0) return removed;

  const { orphans, inUse } = await unreferencedByListings(candidates);
  await deleteImages(orphans);
  mediaLogger.info(`🧹 Removed ${orphans.length} orphaned Cloudinary temp listing images (${inUse} still in use)`);
  return removed + orphans.length;
};

// Export types for use in other modules
export type { UploadType };
