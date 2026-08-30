import { Readable } from 'stream';
import sharp from 'sharp';
import cloudinary from '../config/cloudinary';
import { mediaLogger } from '../utils/logger';
import { registerFileUpload, removeFileRecord, removeAllUserFileRecords } from './storageAccessPolicy';
import { applyWatermark, WatermarkOptions } from './watermarkService';

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
 * Upload types for organized Cloudinary storage
 *
 * Folder structure:
 * balkan-estate/
 * ├── users/
 * │   └── {userId}/
 * │       ├── avatar/
 * │       ├── documents/
 * │       │   ├── license/
 * │       │   └── credentials/
 * │       └── listings/
 * │           ├── temp/
 * │           └── {propertyId}/
 * │               ├── photos/
 * │               └── floorplans/
 * ├── agencies/
 * │   └── {agencyId}/
 * │       ├── logo/
 * │       └── cover/
 * └── businesses/
 *     └── {userEmail}/
 *         └── {businessListingId}/
 *             ├── logo/
 *             └── banner/
 */
type UploadType =
  | 'property'          // User listing photos
  | 'floorplan'         // User listing floorplans
  | 'avatar'            // User profile avatar
  | 'license'           // Agent license document
  | 'credential'        // Agent credential document
  | 'agency-logo'       // Agency logo
  | 'agency-cover'      // Agency cover image
  | 'business-logo'     // Business listing logo
  | 'business-banner'   // Business listing banner
  | 'site-logo'         // Site branding logo
  | 'site-email-logo'   // Site email branding logo
  | 'ad-banner';        // Advertising banner (admin-managed / advertiser creative)

interface UploadOptions {
  userId: string;
  userEmail?: string;
  propertyId?: string;
  /** Human-readable listing title, appended as a slug to the listing folder for readability. */
  propertyTitle?: string;
  agencyId?: string;
  businessListingId?: string;
  credentialId?: string;
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /**
   * Store the master as close to what was uploaded as possible.
   *
   * By default the upload call passes a `transformation`, which Cloudinary
   * applies as an *incoming* transformation — it re-encodes the asset being
   * stored, not just the copy being delivered. Combined with the JPEG
   * re-encode below, the master is already twice-compressed before any
   * delivery transformation touches it, and delivery then compresses a third
   * time. That is invisible on a thumbnail and very visible on something
   * displayed nearly full-bleed.
   *
   * Set this for images shown large, where the extra stored bytes buy real
   * detail. Delivery still optimises per request, so nothing is served
   * unoptimised — only what sits in the bucket changes.
   */
  preserveQuality?: boolean;
  /** Skip the ownership FileRecord (for public uploads with no real user). */
  skipRegistration?: boolean;
}

/**
 * Turn a human title into a short, filesystem/URL-safe folder slug.
 * e.g. "Cozy 2BR in Tëtovo!" → "cozy-2br-in-tetovo"
 * Returns '' when there's nothing usable, so callers can fall back to ID-only.
 */
const slugify = (text: string | undefined, maxLen = 40): string => {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → dashes
    .replace(/^-+|-+$/g, '') // trim leading/trailing dashes
    .slice(0, maxLen)
    .replace(/-+$/g, ''); // re-trim after slice
};

/**
 * Append a readable slug to an ID segment, keeping the ID first so that
 * prefix-based lookups/deletes (which match on the ID) keep working.
 * e.g. ("69a7…d65", "cozy-2br") → "69a7…d65-cozy-2br"
 */
const idSlugSegment = (id: string, slug: string): string =>
  slug ? `${id}-${slug}` : id;

/**
 * Sanitize email for use as a Cloudinary folder name.
 * Replaces @ and dots with underscores, strips unsafe chars.
 * e.g. "john.doe@gmail.com" → "john_doe_at_gmail_com"
 */
const sanitizeEmailForFolder = (email: string): string => {
  return email
    .toLowerCase()
    .replace('@', '_at_')
    .replace(/[^a-z0-9_-]/g, '_');
};

/**
 * Build organized folder path based on upload type
 *
 * Structure:
 * - Users: balkan-estate/users/{userId}/{subfolder}
 * - Agencies: balkan-estate/agencies/{agencyId}/{subfolder}
 */
const buildFolderPath = (options: UploadOptions): string => {
  const { userId, userEmail, propertyId, propertyTitle, agencyId, businessListingId, credentialId, type } = options;
  const ROOT = 'balkan-estate';
  // ID first, readable slug appended — keeps prefix-based deletes
  // (e.g. .../listings/{propertyId}) matching the slugged folder.
  const listingSegment = propertyId ? idSlugSegment(propertyId, slugify(propertyTitle)) : '';

  switch (type) {
    case 'property':
      // balkan-estate/users/{userId}/listings/{propertyId}-{slug}/photos or /temp
      if (propertyId) {
        return `${ROOT}/users/${userId}/listings/${listingSegment}/photos`;
      }
      return `${ROOT}/users/${userId}/listings/temp`;

    case 'floorplan':
      // balkan-estate/users/{userId}/listings/{propertyId}-{slug}/floorplans
      if (propertyId) {
        return `${ROOT}/users/${userId}/listings/${listingSegment}/floorplans`;
      }
      return `${ROOT}/users/${userId}/listings/temp/floorplans`;

    case 'avatar':
      // balkan-estate/users/{userId}/avatar
      return `${ROOT}/users/${userId}/avatar`;

    case 'license':
      // balkan-estate/users/{userId}/documents/license
      return `${ROOT}/users/${userId}/documents/license`;

    case 'credential':
      // balkan-estate/users/{userId}/documents/credentials/{credentialId}
      if (credentialId) {
        return `${ROOT}/users/${userId}/documents/credentials/${credentialId}`;
      }
      return `${ROOT}/users/${userId}/documents/credentials`;

    case 'agency-logo':
      // balkan-estate/agencies/{agencyId}/logo
      return `${ROOT}/agencies/${agencyId || userId}/logo`;

    case 'agency-cover':
      // balkan-estate/agencies/{agencyId}/cover
      return `${ROOT}/agencies/${agencyId || userId}/cover`;

    case 'business-logo': {
      // balkan-estate/businesses/{userEmail}/{businessListingId}/logo
      const emailFolder = userEmail ? sanitizeEmailForFolder(userEmail) : userId;
      const listingId = businessListingId || userId;
      return `${ROOT}/businesses/${emailFolder}/${listingId}/logo`;
    }

    case 'business-banner': {
      // balkan-estate/businesses/{userEmail}/{businessListingId}/banner
      const emailFolder = userEmail ? sanitizeEmailForFolder(userEmail) : userId;
      const listingId = businessListingId || userId;
      return `${ROOT}/businesses/${emailFolder}/${listingId}/banner`;
    }

    case 'site-logo':
      // balkan-estate/site/logo
      return `${ROOT}/site/logo`;

    case 'site-email-logo':
      // balkan-estate/site/email-logo
      return `${ROOT}/site/email-logo`;

    case 'ad-banner':
      // balkan-estate/site/ad-banners
      return `${ROOT}/site/ad-banners`;

    default:
      return `${ROOT}/misc/${userId}`;
  }
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
 * Organized folder structure - see buildFolderPath() for details
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
    // Note: quality parameter not used - using optimized fixed values (90/95) based on compression strategy
  } = options;

  try {
    // Step 1: Light processing using sharp (frontend already compresses)
    // Just ensure correct format and basic optimization
    // Images are already compressed on frontend, so minimal processing needed
    const imageMetadata = await sharp(fileBuffer).metadata();

    let processedBuffer: Buffer;

    // Only resize if image is significantly larger than max dimensions
    // This reduces processing time since frontend already compresses
    if (imageMetadata.width && imageMetadata.height &&
        (imageMetadata.width > maxWidth * 1.5 || imageMetadata.height > maxHeight * 1.5)) {
      mediaLogger.info(`⚡ Image needs resizing: ${imageMetadata.width}x${imageMetadata.height} -> max ${maxWidth}x${maxHeight}`);
      processedBuffer = await sharp(fileBuffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          // 4:4:4 keeps full colour resolution for images shown large —
          // JPEG's default 4:2:0 halves the chroma and shows up as coloured
          // fringing along hard edges once the picture fills the screen.
          quality: preserveQuality ? 95 : 90,
          ...(preserveQuality ? { chromaSubsampling: '4:4:4' } : {}),
          progressive: true,
        })
        .toBuffer();
    } else {
      // Image is already good size, just ensure JPEG format
      mediaLogger.info(`✨ Image already optimized: ${imageMetadata.width}x${imageMetadata.height}, skipping resize`);
      processedBuffer = await sharp(fileBuffer)
        .jpeg({
          quality: preserveQuality ? 98 : 95, // Minimal quality loss
          ...(preserveQuality ? { chromaSubsampling: '4:4:4' } : {}),
          progressive: true,
        })
        .toBuffer();
    }

    const compressedBuffer = processedBuffer;

    // Step 2: Build organized folder path using centralized function
    const folder = buildFolderPath(options);

    // Step 3: Upload to Cloudinary with optimizations
    // Sensitive documents (license, credential) use authenticated delivery (requires signed URL).
    // Public assets (property photos, avatars, logos) use standard upload so they render
    // in <img> tags without authentication — buyers browse listings without logging in.
    const deliveryType = SENSITIVE_TYPES.has(type) ? 'authenticated' : 'upload';
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          type: deliveryType,
          // Cloudinary transformations for automatic optimization.
          //
          // This is an *incoming* transformation: it rewrites the asset being
          // stored, so the master itself is compressed, not just the copies
          // served from it. That is the right trade for most uploads, and the
          // wrong one for an image displayed nearly full-bleed, which is then
          // compressed again on delivery. `preserveQuality` keeps the master
          // as uploaded; delivery still applies `q_auto`/`f_auto` per request
          // via `optimizeCloudinaryUrl`, so nothing is served unoptimised.
          ...(preserveQuality
            ? {}
            : {
              transformation: [
                { quality: 'auto:good' }, // Auto quality adjustment
                { fetch_format: 'auto' }, // Serve WebP to supported browsers
              ],
            }),
          // Add metadata for better organization
          context: {
            type,
            user_id: userId,
            ...(propertyId && { property_id: propertyId }),
          },
          // Enable eager transformations for commonly used sizes
          // This pre-generates optimized versions
          eager: type === 'property' ? [
            { width: 800, height: 600, crop: 'fill', quality: 'auto:good' }, // Thumbnail
            { width: 1200, height: 800, crop: 'fill', quality: 'auto:good' }, // Medium
          ] : undefined,
          eager_async: true, // Generate eagerly in background
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
 * Context for re-hosting an external (scraped) image, used to organize it under
 * the user the listing is attributed to — mirroring the user-uploaded layout:
 *   balkan-estate/users/{userId}/external-listings/{listingId}-{slug}
 * When no attribution is available it falls back to a flat shared folder.
 */
export interface ExternalImageContext {
  /** The user the imported listing is attributed to (source owner or external seller). */
  userId?: string;
  /** Stable per-source listing id (e.g. sourceListingId) for the listing folder. */
  listingId?: string;
  /** Human-readable listing title, appended as a slug for browsability. */
  listingTitle?: string;
}

const buildExternalFolder = (ctx: ExternalImageContext): string => {
  const ROOT = 'balkan-estate';
  if (ctx.userId) {
    const listing = ctx.listingId
      ? `/${idSlugSegment(ctx.listingId, slugify(ctx.listingTitle))}`
      : '';
    return `${ROOT}/users/${ctx.userId}/external-listings${listing}`;
  }
  return `${ROOT}/external-listings`;
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

  const result = await cloudinary.uploader.upload(remoteUrl, {
    folder: buildExternalFolder(context),
    resource_type: 'image',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
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

    // Check authenticated resources first (new policy)
    const authResult = await cloudinary.api.resources({
      type: 'authenticated',
      prefix: folderPath,
      max_results: 500,
    }).catch(() => ({ resources: [] }));

    // Also check legacy public uploads for backwards compatibility
    const uploadResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500,
    }).catch(() => ({ resources: [] }));

    const allPublicIds = [
      ...authResult.resources.map((r: any) => r.public_id),
      ...uploadResult.resources.map((r: any) => r.public_id),
    ];

    // Deduplicate
    const uniqueIds = [...new Set(allPublicIds)];

    if (uniqueIds.length > 0) {
      await deleteImages(uniqueIds);
    }

    mediaLogger.info(`✅ Deleted folder: ${folderPath}`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete folder ${folderPath}:`, error.message);
  }
};

/**
 * Move images from temp folder to property-specific folder
 * Use this when creating a new property - move temp images to the final location
 *
 * Old temp path: balkan-estate/users/{userId}/listings/temp/
 * New path: balkan-estate/users/{userId}/listings/{propertyId}/photos/
 */
export const moveImagesToProperty = async (
  publicIds: string[],
  userId: string,
  propertyId: string,
  isFloorplan: boolean = false
): Promise<string[]> => {
  const newPublicIds: string[] = [];
  const subfolder = isFloorplan ? 'floorplans' : 'photos';

  for (const publicId of publicIds) {
    try {
      // Extract filename from old public_id
      const filename = publicId.split('/').pop();

      // New path with property ID using the new folder structure
      const newPublicId = `balkan-estate/users/${userId}/listings/${propertyId}/${subfolder}/${filename}`;

      // Rename/move the resource (property images are public type)
      const result = await cloudinary.uploader.rename(publicId, newPublicId, {
        overwrite: false,
        invalidate: true,
      });

      // Update the file record with new publicId
      await removeFileRecord(publicId);
      await registerFileUpload({
        publicId: result.public_id,
        url: result.secure_url,
        userId,
        fileType: isFloorplan ? 'floorplan' : 'property',
        resourceId: propertyId,
      });

      newPublicIds.push(result.public_id);
      mediaLogger.info(`📁 Moved image: ${publicId} → ${result.public_id}`);
    } catch (error: any) {
      mediaLogger.error(`⚠️  Failed to move image ${publicId}:`, error.message);
      // Keep old public_id if move fails
      newPublicIds.push(publicId);
    }
  }

  return newPublicIds;
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
 *   balkan-estate/users/{userId}/listings/{propertyId}-{slug}/photos|floorplans
 *
 * The frontend uploads images before the property exists (to a temp folder),
 * so this runs right after the property is created and has an id + title.
 * Only Cloudinary-hosted temp images are moved; external URLs (no publicId, or
 * not under .../listings/temp) are left untouched. Each rename is best-effort —
 * on failure the original ref is kept so a listing never loses its image.
 */
export const organizeListingMedia = async (
  images: ListingImageRef[],
  userId: string,
  propertyId: string,
  propertyTitle?: string
): Promise<ListingImageRef[]> => {
  const segment = idSlugSegment(propertyId, slugify(propertyTitle));
  // Dedupe renames — the main image often shares a publicId with images[0].
  const movedByPublicId = new Map<string, { url: string; publicId: string }>();

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
    const subfolder = isFloorplan ? 'floorplans' : 'photos';
    const filename = publicId.split('/').pop();
    const newPublicId = `balkan-estate/users/${userId}/listings/${segment}/${subfolder}/${filename}`;

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
      out.push({ ...img, url: result.secure_url, publicId: result.public_id });
      mediaLogger.info(`📁 Organized listing image: ${publicId} → ${result.public_id}`);
    } catch (error: any) {
      mediaLogger.error(`⚠️  Failed to organize image ${publicId}:`, error.message);
      out.push(img); // keep original on failure
    }
  }

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
 * Delete all images for a specific listing
 * Path: balkan-estate/users/{userId}/listings/{propertyId}/
 */
export const deleteListingImages = async (
  userId: string,
  propertyId: string
): Promise<void> => {
  const folderPath = `balkan-estate/users/${userId}/listings/${propertyId}`;
  await deleteFolder(folderPath);
};

/**
 * Delete user's avatar
 * Path: balkan-estate/users/{userId}/avatar/
 */
export const deleteUserAvatar = async (userId: string): Promise<void> => {
  const folderPath = `balkan-estate/users/${userId}/avatar`;
  await deleteFolder(folderPath);
};

/**
 * Delete all images for a user (used when deleting user account)
 * Path: balkan-estate/users/{userId}/
 * Also removes all file records for the user from the access policy system.
 */
export const deleteAllUserImages = async (userId: string): Promise<void> => {
  const folderPath = `balkan-estate/users/${userId}`;
  await deleteFolder(folderPath);
  await removeAllUserFileRecords(userId);
};

/**
 * Delete all images for an agency
 * Path: balkan-estate/agencies/{agencyId}/
 */
export const deleteAgencyImages = async (agencyId: string): Promise<void> => {
  const folderPath = `balkan-estate/agencies/${agencyId}`;
  await deleteFolder(folderPath);
};

/**
 * Delete all images for a business listing
 * Path: balkan-estate/businesses/{userEmail}/{businessListingId}/
 */
export const deleteBusinessListingImages = async (
  userEmail: string,
  businessListingId: string
): Promise<void> => {
  const emailFolder = sanitizeEmailForFolder(userEmail);
  const folderPath = `balkan-estate/businesses/${emailFolder}/${businessListingId}`;
  await deleteFolder(folderPath);
};

/**
 * Clean up orphaned temp images for a user
 * Path: balkan-estate/users/{userId}/listings/temp/
 */
export const cleanupTempImages = async (userId: string): Promise<void> => {
  const folderPath = `balkan-estate/users/${userId}/listings/temp`;
  await deleteFolder(folderPath);
};

// Export types for use in other modules
export type { UploadType };
