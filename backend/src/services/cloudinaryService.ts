import { Readable } from 'stream';
import sharp from 'sharp';
import cloudinary from '../config/cloudinary';

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

interface UploadOptions {
  userId: string;
  propertyId?: string;
  type: 'property' | 'avatar' | 'agency-logo' | 'agency-cover' | 'floorplan';
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Upload image to Cloudinary with optimization
 * Folder structure: balkan-estate/{type}/user-{userId}/property-{propertyId}
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
      console.log(`⚡ Image needs resizing: ${imageMetadata.width}x${imageMetadata.height} -> max ${maxWidth}x${maxHeight}`);
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
      console.log(`✨ Image already optimized: ${imageMetadata.width}x${imageMetadata.height}, skipping resize`);
      processedBuffer = await sharp(fileBuffer)
        .jpeg({
          quality: 95, // Minimal quality loss
          progressive: true,
        })
        .toBuffer();
    }

    const compressedBuffer = processedBuffer;

    // Step 2: Build organized folder path
    let folder = `balkan-estate/${type}`;

    if (type === 'property' || type === 'floorplan') {
      // For properties: balkan-estate/properties/user-{userId}/listing-{propertyId}
      if (propertyId) {
        folder = `${folder}/user-${userId}/listing-${propertyId}`;
      } else {
        // If no propertyId yet (creating new listing), use user folder
        folder = `${folder}/user-${userId}/temp`;
      }
    } else if (type === 'avatar') {
      // For avatars: balkan-estate/avatars/user-{userId}
      folder = `${folder}/user-${userId}`;
    } else if (type === 'agency-logo' || type === 'agency-cover') {
      // For agencies: balkan-estate/agencies/user-{userId}
      folder = `balkan-estate/agencies/user-${userId}`;
    }

    // Step 3: Upload to Cloudinary with optimizations
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
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

    console.log(`✅ Uploaded image to Cloudinary: ${result.public_id} (${Math.round(result.bytes / 1024)}KB)`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error: any) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload multiple images for a property listing
 */
export const uploadPropertyImages = async (
  files: Express.Multer.File[],
  userId: string,
  propertyId?: string
): Promise<Array<{ url: string; publicId: string; tag: string }>> => {
  const uploadedImages: Array<{ url: string; publicId: string; tag: string }> = [];

  console.log(`📤 Uploading ${files.length} images for user ${userId}${propertyId ? `, property ${propertyId}` : ''}`);

  for (const file of files) {
    try {
      const result = await uploadImage(file.buffer, {
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
      console.error(`⚠️  Failed to upload image: ${error.message}`);
      // Continue with other images even if one fails
    }
  }

  console.log(`✅ Successfully uploaded ${uploadedImages.length}/${files.length} images`);

  return uploadedImages;
};

/**
 * Delete image from Cloudinary
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️  Deleted image from Cloudinary: ${publicId}`);
  } catch (error: any) {
    console.error(`❌ Failed to delete image ${publicId}:`, error.message);
    // Don't throw - we don't want to fail the whole operation if cleanup fails
  }
};

/**
 * Delete multiple images from Cloudinary
 */
export const deleteImages = async (publicIds: string[]): Promise<void> => {
  if (!publicIds || publicIds.length === 0) {
    return;
  }

  console.log(`🗑️  Deleting ${publicIds.length} images from Cloudinary...`);

  try {
    // Cloudinary allows batch deletion
    const result = await cloudinary.api.delete_resources(publicIds);
    console.log(`✅ Deleted ${Object.keys(result.deleted).length} images from Cloudinary`);
  } catch (error: any) {
    console.error(`❌ Batch delete error:`, error.message);
    // Fallback to individual deletion
    await Promise.all(publicIds.map(id => deleteImage(id)));
  }
};

/**
 * Delete all images in a folder (e.g., when deleting a property)
 */
export const deleteFolder = async (folderPath: string): Promise<void> => {
  try {
    console.log(`🗑️  Deleting folder: ${folderPath}`);

    // Get all resources in the folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500,
    });

    if (result.resources.length > 0) {
      const publicIds = result.resources.map((r: any) => r.public_id);
      await deleteImages(publicIds);
    }

    console.log(`✅ Deleted folder: ${folderPath}`);
  } catch (error: any) {
    console.error(`❌ Failed to delete folder ${folderPath}:`, error.message);
  }
};

/**
 * Move images from temp folder to property-specific folder
 * Use this when creating a new property - move temp images to the final location
 */
export const moveImagesToProperty = async (
  publicIds: string[],
  userId: string,
  propertyId: string
): Promise<string[]> => {
  const newPublicIds: string[] = [];

  for (const publicId of publicIds) {
    try {
      // Extract filename from old public_id
      const filename = publicId.split('/').pop();

      // New path with property ID
      const newPublicId = `balkan-estate/properties/user-${userId}/listing-${propertyId}/${filename}`;

      // Rename/move the resource
      const result = await cloudinary.uploader.rename(publicId, newPublicId, {
        overwrite: false,
        invalidate: true,
      });

      newPublicIds.push(result.public_id);
      console.log(`📁 Moved image: ${publicId} → ${result.public_id}`);
    } catch (error: any) {
      console.error(`⚠️  Failed to move image ${publicId}:`, error.message);
      // Keep old public_id if move fails
      newPublicIds.push(publicId);
    }
  }

  return newPublicIds;
};

/**
 * Get optimized image URL with transformations
 * This doesn't require a new request to Cloudinary - just builds the URL
 */
export const getOptimizedUrl = (
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  } = {}
): string => {
  const { width, height, crop = 'fill', quality = 'auto:good' } = options;

  return cloudinary.url(publicId, {
    transformation: [
      ...(width && height ? [{ width, height, crop }] : []),
      { quality },
      { fetch_format: 'auto' },
    ],
    secure: true,
  });
};
