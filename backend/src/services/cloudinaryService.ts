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
 * └── agencies/
 *     └── {agencyId}/
 *         ├── logo/
 *         └── cover/
 */
type UploadType =
  | 'property'      // User listing photos
  | 'floorplan'     // User listing floorplans
  | 'avatar'        // User profile avatar
  | 'license'       // Agent license document
  | 'credential'    // Agent credential document
  | 'agency-logo'   // Agency logo
  | 'agency-cover'; // Agency cover image

interface UploadOptions {
  userId: string;
  propertyId?: string;
  agencyId?: string;
  credentialId?: string;
  type: UploadType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Build organized folder path based on upload type
 *
 * Structure:
 * - Users: balkan-estate/users/{userId}/{subfolder}
 * - Agencies: balkan-estate/agencies/{agencyId}/{subfolder}
 */
const buildFolderPath = (options: UploadOptions): string => {
  const { userId, propertyId, agencyId, credentialId, type } = options;
  const ROOT = 'balkan-estate';

  switch (type) {
    case 'property':
      // balkan-estate/users/{userId}/listings/{propertyId}/photos or /temp
      if (propertyId) {
        return `${ROOT}/users/${userId}/listings/${propertyId}/photos`;
      }
      return `${ROOT}/users/${userId}/listings/temp`;

    case 'floorplan':
      // balkan-estate/users/{userId}/listings/{propertyId}/floorplans
      if (propertyId) {
        return `${ROOT}/users/${userId}/listings/${propertyId}/floorplans`;
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
          quality: 90, // Higher quality since frontend already compressed
          progressive: true,
        })
        .toBuffer();
    } else {
      // Image is already good size, just ensure JPEG format
      mediaLogger.info(`✨ Image already optimized: ${imageMetadata.width}x${imageMetadata.height}, skipping resize`);
      processedBuffer = await sharp(fileBuffer)
        .jpeg({
          quality: 95, // Minimal quality loss
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
          // Cloudinary transformations for automatic optimization
          transformation: [
            { quality: 'auto:good' }, // Auto quality adjustment
            { fetch_format: 'auto' }, // Serve WebP to supported browsers
          ],
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

    // Step 4: Register file in storage access policy (ownership tracking)
    await registerFileUpload({
      publicId: result.public_id,
      url: result.secure_url,
      userId,
      fileType: type,
      resourceId: propertyId,
      mimeType: `image/${result.format}`,
      bytes: result.bytes,
    });

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
  watermarkOptions?: WatermarkOptions
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
 * Clean up orphaned temp images for a user
 * Path: balkan-estate/users/{userId}/listings/temp/
 */
export const cleanupTempImages = async (userId: string): Promise<void> => {
  const folderPath = `balkan-estate/users/${userId}/listings/temp`;
  await deleteFolder(folderPath);
};

// Export types for use in other modules
export type { UploadType };
