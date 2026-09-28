import { Readable } from 'stream';
import { createHash } from 'crypto';
import sharp from 'sharp';
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

/**
 * Cloudinary Service - Efficient image upload and management
 *
 * Cost optimization strategies:
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
 * Delete image from Cloudinary and remove its file record.
 * Tries authenticated first, then falls back to upload type,
 * since the file may be either delivery type.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    // Try the standard upload type first (most files are public)
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === 'not found') {
      // May be an authenticated resource (license/credential)
      await cloudinary.uploader.destroy(publicId, { type: 'authenticated' });
    }
    await removeFileRecord(publicId);
    mediaLogger.info(`🗑️  Deleted image from Cloudinary: ${publicId}`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete image ${publicId}:`, error.message);
    // Don't throw - we don't want to fail the whole operation if cleanup fails
  }
};

/**
 * Delete multiple images from Cloudinary and remove their file records
 */
export const deleteImages = async (publicIds: string[]): Promise<void> => {
  if (!publicIds || publicIds.length === 0) {
    return;
  }

  mediaLogger.info(`🗑️  Deleting ${publicIds.length} images from Cloudinary...`);

  try {
    // Cloudinary allows batch deletion — try both delivery types
    const uploadResult = await cloudinary.api.delete_resources(publicIds);
    const notDeleted = Object.entries(uploadResult.deleted)
      .filter(([, status]) => status === 'not_found')
      .map(([id]) => id);
    if (notDeleted.length > 0) {
      await cloudinary.api.delete_resources(notDeleted, { type: 'authenticated' });
    }
    // Clean up file records for all deleted resources
    await Promise.all(publicIds.map(id => removeFileRecord(id)));
    mediaLogger.info(`✅ Deleted ${publicIds.length} images from Cloudinary`);
  } catch (error: any) {
    mediaLogger.error(`❌ Batch delete error:`, error.message);
    // Fallback to individual deletion
    await Promise.all(publicIds.map(id => deleteImage(id)));
  }
};

/**
 * Delete all images in a folder (e.g., when deleting a property)
 * Checks both authenticated and public upload types for backwards compatibility.
 */
export const deleteFolder = async (folderPath: string): Promise<void> => {
  try {
    mediaLogger.info(`🗑️  Deleting folder: ${folderPath}`);
    const ids = new Set<string>();

    // Both delivery types: documents are 'authenticated', everything else 'upload'.
    for (const type of ['authenticated', 'upload'] as const) {
      let cursor: string | undefined;
      do {
        const page: any = await cloudinary.api
          .resources({ type, prefix: folderPath, max_results: 500, ...(cursor ? { next_cursor: cursor } : {}) })
          .catch(() => ({ resources: [] }));
        for (const r of page.resources || []) ids.add(r.public_id);
        cursor = page.next_cursor;
      } while (cursor);
    }

    const all = [...ids];
    // delete_resources accepts at most 100 ids per call.
    for (let i = 0; i < all.length; i += 100) {
      await deleteImages(all.slice(i, i + 100));
    }

    mediaLogger.info(`✅ Deleted folder: ${folderPath} (${all.length} files)`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete folder ${folderPath}:`, error.message);
  }
};

/**
 * Delete every asset carrying `tag`, across images/videos and both delivery
 * types. Tags survive renames and folder-layout changes, so this is the
 * reliable way to clean up everything belonging to a listing, user, agency or
 * business. Admin API — rate-limited but not billed as credits.
 */
export const deleteByTag = async (tag: string): Promise<void> => {
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

/** Add a tag to already-uploaded assets (e.g. temp uploads once their listing exists). */
const addTag = async (tag: string, publicIds: string[]): Promise<void> => {
  if (publicIds.length === 0) return;
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
 * Relocate a listing's freshly-uploaded temp images into the listing's own
 * folder, so Cloudinary is organized as:
 *   balkan-estate/users/{a-z}/{user-name}_{userId}/listings/{title}_{propertyId}/photos|floorplans
 *
 * The frontend uploads images before the property exists (to a temp folder),
 * so this runs right after the property is created and has an id + title.
 * Only Cloudinary-hosted temp images are moved; external URLs (no publicId, or
 * not under .../listings/temp) are left untouched. Each rename is best-effort —
 * on failure the original ref is kept (and still tagged) so a listing never
 * loses its image and cleanup still finds it.
 */
export const organizeListingMedia = async (
  images: ListingImageRef[],
  userId: string,
  propertyId: string,
  propertyTitle?: string
): Promise<ListingImageRef[]> => {
  const owner = await resolveMediaOwner('property', { userId, propertyId, propertyTitle });
  // Dedupe renames — the main image often shares a publicId with images[0].
  const movedByPublicId = new Map<string, { url: string; publicId: string }>();
  const toTag: string[] = [];

  const out: ListingImageRef[] = [];
  for (const img of images) {
    const publicId = img.publicId;
    if (!publicId || !publicId.includes('/listings/temp')) {
      out.push(img); // external URL or already organized — leave as-is
      continue;
    }

    const cached = movedByPublicId.get(publicId);
    if (cached) {
      out.push({ ...img, url: cached.url, publicId: cached.publicId });
      continue;
    }

    const isFloorplan = img.tag === 'floorplan';
    const folder = buildMediaFolder(isFloorplan ? 'floorplan' : 'property', owner);
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
        fileType: isFloorplan ? 'floorplan' : 'property',
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
 * Get optimized image URL with transformations.
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
 * generated video. Goes by tag first, then sweeps the folder layouts used
 * before tagging existed, then any explicit public ids the caller still holds.
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

  if (keep.size > 0) {
    // Untag the keepers so the tag sweep leaves them alone.
    try {
      await cloudinary.uploader.remove_tag(listingTag(propertyId), [...keep]);
    } catch (error: any) {
      mediaLogger.warn(`⚠️  Could not untag kept files for ${propertyId}: ${error.message}`);
    }
  }

  await deleteByTag(listingTag(propertyId));

  // Layouts from before tags: users/{userId}/listings/{propertyId}… and properties/user-…
  for (const prefix of [
    `${MEDIA_ROOT}/users/${userId}/listings/${propertyId}`,
    `${MEDIA_ROOT}/properties/user-${userId}/listing-${propertyId}`,
  ]) {
    await deleteFolderExcept(prefix, keep);
  }

  const remaining = (options.publicIds || []).filter((id) => id && !keep.has(id));
  if (remaining.length > 0) await deleteImages(remaining);

  // Generated showcase videos, including ones uploaded before tagging.
  for (const videoId of [
    ...(options.videoPublicIds || []),
    `${MEDIA_ROOT}/users/${userId}/listings/${propertyId}/videos/showcase`,
  ]) {
    await cloudinary.uploader.destroy(videoId, { resource_type: 'video' }).catch(() => undefined);
  }
};

/** deleteFolder that spares specific public ids. */
const deleteFolderExcept = async (prefix: string, keep: Set<string>): Promise<void> => {
  if (keep.size === 0) {
    await deleteFolder(prefix);
    return;
  }
  try {
    const page: any = await cloudinary.api.resources({ type: 'upload', prefix, max_results: 500 });
    const ids = (page.resources || []).map((r: any) => r.public_id).filter((id: string) => !keep.has(id));
    for (let i = 0; i < ids.length; i += 100) await deleteImages(ids.slice(i, i + 100));
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to sweep ${prefix}:`, error.message);
  }
};

/**
 * Delete a user's personal files — avatar and verification documents.
 * Used when an account is closed; listing media is handled with the listings.
 */
export const deleteUserPersonalMedia = async (userId: string): Promise<void> => {
  const personal: string[] = [];
  for (const fileType of ['avatar', 'license', 'credential'] as const) {
    try {
      const { files } = await getUserFiles(userId, fileType, 1, 500);
      personal.push(...files.map((f) => f.publicId));
    } catch (error: any) {
      mediaLogger.warn(`⚠️  Could not list ${fileType} files for ${userId}: ${error.message}`);
    }
  }
  for (let i = 0; i < personal.length; i += 100) await deleteImages(personal.slice(i, i + 100));

  // Layout from before tagging.
  await deleteFolder(`${MEDIA_ROOT}/users/${userId}/avatar`);
  await deleteFolder(`${MEDIA_ROOT}/users/${userId}/documents`);
};

/** Delete an agency's logo and cover. */
export const deleteAgencyMedia = async (agencyId: string): Promise<void> => {
  await deleteByTag(agencyTag(agencyId));
  await deleteFolder(`${MEDIA_ROOT}/agencies/${agencyId}/`);
};

/**
 * Sweep listing photos that were uploaded but never attached to a listing.
 *
 * The listing form uploads photos to `.../listings/temp` before the property
 * exists; if the seller abandons the form, those files stay in Cloudinary and
 * are billed as storage forever. This deletes temp uploads older than
 * `maxAgeHours` that no Property still references (a failed move on create
 * can leave a live listing pointing at a temp file, so we check first).
 *
 * Uses the Admin API (rate-limited, but not billed as credits).
 */
export const cleanupOrphanedTempImages = async (maxAgeHours = 48): Promise<number> => {
  // Lazy import keeps this service free of a model dependency at load time.
  const { default: Property } = await import('../models/Property');
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
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
      if (r.public_id.includes('/listings/temp/') && new Date(r.created_at).getTime() < cutoff) {
        candidates.push(r.public_id);
      }
    }
    cursor = page.next_cursor;
  } while (cursor);

  if (candidates.length === 0) return 0;

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

  const orphans = candidates.filter((id) => !inUse.has(id));
  // delete_resources accepts at most 100 ids per call.
  for (let i = 0; i < orphans.length; i += 100) {
    await deleteImages(orphans.slice(i, i + 100));
  }
  mediaLogger.info(`🧹 Removed ${orphans.length} orphaned temp listing images (${inUse.size} still in use)`);
  return orphans.length;
};

// Export types for use in other modules
export type { UploadType };
