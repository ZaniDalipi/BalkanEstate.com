import crypto from 'crypto';
import sharp from 'sharp';
import { isBunnyConfigured } from '../config/bunny';
import {
  putObject,
  deleteObject,
  deleteFolderRecursive,
  moveObject,
} from './bunnyStorageService';
import {
  buildBunnyUrl,
  signBunnyUrl,
  BunnyTransformOptions,
} from '../utils/bunnyUrl';
import { mediaLogger } from '../utils/logger';
import { registerFileUpload, removeFileRecord, removeAllUserFileRecords } from './storageAccessPolicy';
import { applyWatermark, WatermarkOptions } from './watermarkService';

/**
 * Image storage — uploads, deletes, and the folder layout, on Bunny.net.
 *
 * Cost optimization strategies:
 * 1. Pre-compress with sharp before upload (smaller stored objects)
 * 2. Resize oversized images to sensible dimensions
 * 3. Let Bunny Optimizer resize and re-encode per request at the edge, so one
 *    stored master serves every size the site asks for
 * 4. Store the storage path in the database, and rebuild URLs from it
 * 5. Organized folder structure for easy cleanup
 *
 * On identifiers: an object's `publicId` is its **path within the storage
 * zone**, extension included — `balkan-estate/users/{id}/avatar/{uuid}.jpg`.
 * Unlike Cloudinary's opaque public IDs this is directly addressable, so a URL
 * can always be rebuilt from a database row without calling Bunny, and the
 * prefix-matching that drives folder deletes works on the string itself.
 */

export interface ImageUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload types for organized storage
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
   * Bunny stores exactly the bytes we send and transforms only on delivery, so
   * the master is compressed once — by sharp, below — rather than re-encoded on
   * the way in. This flag now controls just that one encode: raise the JPEG
   * quality and keep full chroma resolution for images shown nearly full-bleed,
   * where 4:2:0's halved colour resolution shows as fringing on hard edges.
   *
   * Delivery still optimises per request, so nothing is served unoptimised —
   * only what sits in the bucket changes.
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
 * Sanitize email for use as a folder name.
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
 * A unique object name.
 *
 * Cloudinary minted these for us; Bunny overwrites whatever path it is handed,
 * so a colliding name would silently replace someone else's photo. Random,
 * not derived from the file: two users uploading the same stock photo into the
 * same folder must not land on the same object.
 */
const generateObjectName = (extension = 'jpg'): string =>
  `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.${extension}`;

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
      if (propertyId) {
        return `${ROOT}/users/${userId}/listings/${listingSegment}/photos`;
      }
      return `${ROOT}/users/${userId}/listings/temp`;

    case 'floorplan':
      if (propertyId) {
        return `${ROOT}/users/${userId}/listings/${listingSegment}/floorplans`;
      }
      return `${ROOT}/users/${userId}/listings/temp/floorplans`;

    case 'avatar':
      return `${ROOT}/users/${userId}/avatar`;

    case 'license':
      return `${ROOT}/users/${userId}/documents/license`;

    case 'credential':
      if (credentialId) {
        return `${ROOT}/users/${userId}/documents/credentials/${credentialId}`;
      }
      return `${ROOT}/users/${userId}/documents/credentials`;

    case 'agency-logo':
      return `${ROOT}/agencies/${agencyId || userId}/logo`;

    case 'agency-cover':
      return `${ROOT}/agencies/${agencyId || userId}/cover`;

    case 'business-logo': {
      const emailFolder = userEmail ? sanitizeEmailForFolder(userEmail) : userId;
      const listingId = businessListingId || userId;
      return `${ROOT}/businesses/${emailFolder}/${listingId}/logo`;
    }

    case 'business-banner': {
      const emailFolder = userEmail ? sanitizeEmailForFolder(userEmail) : userId;
      const listingId = businessListingId || userId;
      return `${ROOT}/businesses/${emailFolder}/${listingId}/banner`;
    }

    case 'site-logo':
      return `${ROOT}/site/logo`;

    case 'site-email-logo':
      return `${ROOT}/site/email-logo`;

    case 'ad-banner':
      return `${ROOT}/site/ad-banners`;

    default:
      return `${ROOT}/misc/${userId}`;
  }
};

/**
 * Encode the master we actually store.
 *
 * Everything the site displays is rendered from this one object by Bunny
 * Optimizer, so its job is to be the smallest file that still holds every
 * detail a delivery-time resize might need — not to be a pristine archive.
 * Three things do most of the work:
 *
 *  - **WebP, not JPEG.** At matched visual quality WebP lands roughly 25-30%
 *    smaller. Bunny transcodes from it happily, and it re-encodes to whatever
 *    a given browser advertises, so the stored format is not what visitors
 *    receive.
 *  - **Always resize.** The old threshold only shrank images more than 1.5x
 *    over the cap, so a 2800x1800 photo was stored whole — twice the pixels of
 *    the 1920-wide master anything actually renders from.
 *  - **Drop metadata.** sharp strips EXIF unless asked not to, which trims a
 *    little weight and, for property photos taken on a phone, removes the GPS
 *    tag that would otherwise publish the seller's address.
 *
 * `.rotate()` runs first and must: it bakes in the EXIF orientation flag
 * before that flag is stripped, and without it phone photos are stored sideways.
 */
export const encodeMaster = async (
  fileBuffer: Buffer,
  options: { maxWidth: number; maxHeight: number; preserveQuality: boolean }
): Promise<{ buffer: Buffer; width: number; height: number }> => {
  const { data, info } = await sharp(fileBuffer)
    .rotate()
    .resize(options.maxWidth, options.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      // 76 is visually clean on photographs; 86 is for images shown nearly
      // full-bleed, where compression artifacts on flat walls and sky become
      // visible. Neither is the delivery quality — that is set per request.
      quality: options.preserveQuality ? 86 : 76,
      // Costs CPU at upload once, saves bytes on every request forever.
      effort: 5,
      // WebP's default chroma subsampling halves colour resolution and shows
      // as fringing along hard edges; this keeps it for the large images.
      smartSubsample: options.preserveQuality,
    })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, width: info.width, height: info.height };
};

/**
 * Sensitive file types that must never be served from the public pull zone.
 *
 * These are private documents. They live in the same storage zone as
 * everything else, but their URLs are only ever handed out signed, against the
 * token-authenticated private pull zone — see `storageAccessPolicy`.
 */
const SENSITIVE_TYPES: ReadonlySet<UploadType> = new Set(['license', 'credential']);

/** True when this type's URLs require a signature. Exported for the access policy. */
export const isSensitiveType = (type: string): boolean =>
  SENSITIVE_TYPES.has(type as UploadType);

/**
 * Upload image to Bunny storage with optimization
 *
 * Organized folder structure - see buildFolderPath() for details
 */
export const uploadImage = async (
  fileBuffer: Buffer,
  options: UploadOptions
): Promise<ImageUploadResult> => {
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
    // Step 1: Re-encode to the stored master. See `encodeMaster` — this is the
    // only compression that touches the bytes we keep; delivery sizes are
    // rendered from it on demand.
    const { buffer: masterBuffer, width, height } = await encodeMaster(fileBuffer, {
      maxWidth,
      maxHeight,
      preserveQuality,
    });

    mediaLogger.info(
      `🗜️  Encoded master: ${width}x${height}, ${Math.round(masterBuffer.length / 1024)}KB ` +
      `(from ${Math.round(fileBuffer.length / 1024)}KB)`
    );

    // Step 2: Build organized folder path using centralized function
    const folder = buildFolderPath(options);
    const storagePath = `${folder}/${generateObjectName('webp')}`;

    // Step 3: Upload to Bunny storage.
    //
    // No eager/derived versions are generated here. Bunny Optimizer renders a
    // size on first request and caches it at the edge, so pre-generating
    // thumbnails would pay for renders nobody asked for.
    await putObject(storagePath, masterBuffer, 'image/webp');

    const isSensitive = SENSITIVE_TYPES.has(type);
    // Sensitive documents get no stored public URL — the only URL that works
    // for them is a short-lived signed one, minted per authorized request.
    const url = isSensitive ? '' : buildBunnyUrl(storagePath);

    mediaLogger.info(`✅ Uploaded image to Bunny: ${storagePath}`);

    // Step 4: Register file in storage access policy (ownership tracking).
    // Skipped for public uploads (e.g. advertising creatives) that have no user.
    if (!options.skipRegistration) {
      await registerFileUpload({
        publicId: storagePath,
        url,
        userId,
        fileType: type,
        resourceId: propertyId,
        mimeType: 'image/webp',
        bytes: masterBuffer.length,
      });
    }

    return {
      url,
      publicId: storagePath,
      width,
      height,
      format: 'webp',
      bytes: masterBuffer.length,
    };
  } catch (error: any) {
    mediaLogger.error('❌ Bunny upload error:', error);
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

/** Cap on a re-hosted source image, so one huge remote file cannot exhaust memory. */
const MAX_REMOTE_IMAGE_BYTES = 25 * 1024 * 1024;

/**
 * Upload an image directly from a remote URL.
 * Used by the universal-listings ingest pipeline to re-host external images
 * onto our own CDN so frontend image optimization (srcset / WebP) keeps working
 * and source sites can't break our listings by deleting images later.
 *
 * Cloudinary fetched the remote URL itself. Bunny's storage API only accepts
 * bytes, so the download happens here — which also means a source that returns
 * an error page instead of an image fails now, at ingest, rather than becoming
 * a broken listing photo.
 */
export const uploadFromUrl = async (
  remoteUrl: string,
  context: ExternalImageContext = {}
): Promise<ImageUploadResult> => {
  // In local/development we NEVER re-host external images — that would consume
  // storage/bandwidth for throwaway dev data. Always reference the source URL
  // directly instead. Same when Bunny isn't configured at all.
  if (process.env.NODE_ENV !== 'production' || !isBunnyConfigured()) {
    mediaLogger.info(`⏭️  [dev] Skipping re-host, referencing source: ${remoteUrl}`);
    return { url: remoteUrl, publicId: '', width: 0, height: 0, format: '', bytes: 0 };
  }

  const response = await fetch(remoteUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source image ${remoteUrl}: ${response.status}`);
  }

  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error(`Source image ${remoteUrl} is too large (${declaredLength} bytes)`);
  }

  const sourceBuffer = Buffer.from(await response.arrayBuffer());
  if (sourceBuffer.length > MAX_REMOTE_IMAGE_BYTES) {
    throw new Error(`Source image ${remoteUrl} is too large (${sourceBuffer.length} bytes)`);
  }

  // Same encoder as a user upload — it normalises the format and, more
  // importantly, rejects a response that is not actually an image.
  const { buffer, width, height } = await encodeMaster(sourceBuffer, {
    maxWidth: 1920,
    maxHeight: 1080,
    preserveQuality: false,
  });

  const storagePath = `${buildExternalFolder(context)}/${generateObjectName('webp')}`;

  await putObject(storagePath, buffer, 'image/webp');
  mediaLogger.info(`✅ Re-hosted external image to Bunny: ${storagePath} (${Math.round(buffer.length / 1024)}KB)`);

  return {
    url: buildBunnyUrl(storagePath),
    publicId: storagePath,
    width,
    height,
    format: 'webp',
    bytes: buffer.length,
  };
};

/**
 * Delete an image and remove its file record.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await deleteObject(publicId);
    await removeFileRecord(publicId);
    mediaLogger.info(`🗑️  Deleted image from Bunny: ${publicId}`);
  } catch (error: any) {
    mediaLogger.error(`❌ Failed to delete image ${publicId}:`, error.message);
    // Don't throw - we don't want to fail the whole operation if cleanup fails
  }
};

/** How many deletes to have in flight at once. Bunny is per-object, so batch by hand. */
const DELETE_CONCURRENCY = 10;

/**
 * Delete multiple images and remove their file records.
 *
 * Bunny has no batch delete endpoint, so this is one request per object, run in
 * bounded parallel rather than all at once — a listing can carry dozens of
 * photos and firing them off simultaneously invites rate limiting.
 */
export const deleteImages = async (publicIds: string[]): Promise<void> => {
  if (!publicIds || publicIds.length === 0) {
    return;
  }

  mediaLogger.info(`🗑️  Deleting ${publicIds.length} images from Bunny...`);

  for (let i = 0; i < publicIds.length; i += DELETE_CONCURRENCY) {
    const chunk = publicIds.slice(i, i + DELETE_CONCURRENCY);
    await Promise.all(chunk.map(id => deleteImage(id)));
  }

  mediaLogger.info(`✅ Deleted ${publicIds.length} images from Bunny`);
};

/**
 * Delete all images in a folder (e.g., when deleting a property),
 * along with the ownership record of everything removed.
 */
export const deleteFolder = async (folderPath: string): Promise<void> => {
  try {
    mediaLogger.info(`🗑️  Deleting folder: ${folderPath}`);

    const deleted = await deleteFolderRecursive(folderPath);
    await Promise.all(deleted.map(path => removeFileRecord(path)));

    mediaLogger.info(`✅ Deleted folder: ${folderPath} (${deleted.length} objects)`);
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
      // Extract filename from old path
      const filename = publicId.split('/').pop();

      // New path with property ID using the new folder structure
      const newPublicId = `balkan-estate/users/${userId}/listings/${propertyId}/${subfolder}/${filename}`;

      const moved = await moveObject(publicId, newPublicId);
      if (!moved) {
        newPublicIds.push(publicId);
        continue;
      }

      // Update the file record with new publicId
      await removeFileRecord(publicId);
      await registerFileUpload({
        publicId: newPublicId,
        url: buildBunnyUrl(newPublicId),
        userId,
        fileType: isFloorplan ? 'floorplan' : 'property',
        resourceId: propertyId,
      });

      newPublicIds.push(newPublicId);
      mediaLogger.info(`📁 Moved image: ${publicId} → ${newPublicId}`);
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
 * folder, so storage is organized as:
 *   balkan-estate/users/{userId}/listings/{propertyId}-{slug}/photos|floorplans
 *
 * The frontend uploads images before the property exists (to a temp folder),
 * so this runs right after the property is created and has an id + title.
 * Only our own temp images are moved; external URLs (no publicId, or not under
 * .../listings/temp) are left untouched. Each move is best-effort — on failure
 * the original ref is kept so a listing never loses its image.
 */
export const organizeListingMedia = async (
  images: ListingImageRef[],
  userId: string,
  propertyId: string,
  propertyTitle?: string
): Promise<ListingImageRef[]> => {
  const segment = idSlugSegment(propertyId, slugify(propertyTitle));
  // Dedupe moves — the main image often shares a publicId with images[0].
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
      const moved = await moveObject(publicId, newPublicId);
      if (!moved) {
        out.push(img);
        continue;
      }

      const newUrl = buildBunnyUrl(newPublicId);
      await removeFileRecord(publicId);
      await registerFileUpload({
        publicId: newPublicId,
        url: newUrl,
        userId,
        fileType: isFloorplan ? 'floorplan' : 'property',
        resourceId: propertyId,
      });
      movedByPublicId.set(publicId, { url: newUrl, publicId: newPublicId });
      out.push({ ...img, url: newUrl, publicId: newPublicId });
      mediaLogger.info(`📁 Organized listing image: ${publicId} → ${newPublicId}`);
    } catch (error: any) {
      mediaLogger.error(`⚠️  Failed to organize image ${publicId}:`, error.message);
      out.push(img); // keep original on failure
    }
  }

  return out;
};

/** How long a signed document URL stays valid. */
export const SIGNED_URL_TTL_SECONDS = 60 * 10;

/**
 * Get an optimized image URL with transformations.
 * Signed against the private pull zone for sensitive file types, plain CDN URL
 * for public assets. Either way this is pure string building — no request to
 * Bunny is made.
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

  const transform: BunnyTransformOptions = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    crop: crop as BunnyTransformOptions['crop'],
    quality: quality as BunnyTransformOptions['quality'],
  };

  return sensitive
    ? signBunnyUrl(publicId, SIGNED_URL_TTL_SECONDS, transform)
    : buildBunnyUrl(publicId, transform);
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
