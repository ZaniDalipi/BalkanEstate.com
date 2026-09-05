import { buildBunnyUrl, signBunnyUrl } from '../utils/bunnyUrl';
import FileRecord, { IFileRecord } from '../models/FileRecord';
import { mediaLogger } from '../utils/logger';

/**
 * Storage Access Policy Service
 *
 * Enforces ownership-based access control for all uploaded files.
 * Users can only access files they uploaded. Admins can access any file.
 *
 * Flow:
 * 1. File is uploaded via imageStorageService with a sensitive type
 * 2. A FileRecord is created linking publicId -> userId (owner)
 * 3. When a client needs to display/download a file, it calls GET /api/files/signed-url
 * 4. This service checks ownership, then generates a short-lived signed URL
 * 5. The client uses the signed URL (valid for a limited time) to access the file
 *
 * Security notes:
 * - Cloudinary signed URLs with type: 'authenticated' prevent access without a valid
 *   HMAC signature, but the signature itself does not expire. Actual time-based
 *   expiration requires Cloudinary's Token-based Authentication (paid feature).
 * - The _exp query param is for client-side cache invalidation only.
 * - All publicIds that reach this service should already be sanitized by the controller.
 */

const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour (client-side cache guidance)

/**
 * Strip control characters from a string before logging.
 * Prevents log injection via newlines, carriage returns, etc.
 */
const safeLog = (s: string): string =>
  s.replace(/[\x00-\x1f\x7f]/g, '');

/**
 * Register a file upload in the access policy system.
 * Must be called after every successful Cloudinary upload.
 */
export const registerFileUpload = async (params: {
  publicId: string;
  url: string;
  userId: string;
  fileType: IFileRecord['fileType'];
  resourceId?: string;
  mimeType?: string;
  bytes?: number;
}): Promise<IFileRecord> => {
  const { publicId, url, userId, fileType, resourceId, mimeType, bytes } = params;

  // Upsert to handle re-uploads (e.g., avatar replacement)
  const fileRecord = await FileRecord.findOneAndUpdate(
    { publicId },
    {
      publicId,
      url,
      userId,
      fileType,
      resourceId,
      mimeType,
      bytes,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  mediaLogger.info(`Registered file record: ${safeLog(publicId)} (owner: ${safeLog(userId)}, type: ${fileType})`);

  return fileRecord;
};

/**
 * Check if a user is the owner of a file.
 */
export const isFileOwner = async (
  userId: string,
  publicId: string
): Promise<boolean> => {
  const record = await FileRecord.findOne({ publicId });
  if (!record) return false;
  return record.userId.toString() === userId;
};

/**
 * Check if a user can access a file.
 * Returns the FileRecord if access is granted, null otherwise.
 */
export const checkFileAccess = async (
  userId: string,
  publicId: string,
  userRole?: string
): Promise<IFileRecord | null> => {
  const record = await FileRecord.findOne({ publicId });

  if (!record) {
    mediaLogger.warn(`File access denied: no record found for ${safeLog(publicId)}`);
    return null;
  }

  // Owner always has access
  if (record.userId.toString() === userId) {
    return record;
  }

  // Admins can access any file
  if (userRole === 'admin') {
    return record;
  }

  mediaLogger.warn(`File access denied: user ${safeLog(userId)} is not the owner of ${safeLog(publicId)}`);
  return null;
};

/**
 * Sensitive file types that are served only from the token-authenticated
 * private pull zone.
 * Must be kept in sync with SENSITIVE_TYPES in imageStorageService.ts.
 */
const SENSITIVE_FILE_TYPES = new Set(['license', 'credential']);

/**
 * Generate a delivery URL for a stored object.
 *
 * For sensitive files (license, credential): a URL signed with the private pull
 * zone's token key, which the CDN itself rejects once `expires` passes.
 * For public files (property, avatar, etc.): a standard optimized CDN URL.
 *
 * The expiry is enforced by Bunny rather than advertised to the client, so
 * unlike the Cloudinary version this needs no companion `_exp` parameter.
 */
export const generateSignedUrl = (
  publicId: string,
  _resourceType: 'image' | 'video' | 'raw' = 'image',
  fileType?: string
): string => {
  const isSensitive = fileType ? SENSITIVE_FILE_TYPES.has(fileType) : false;

  return isSensitive
    ? signBunnyUrl(publicId, SIGNED_URL_EXPIRY_SECONDS, { quality: 'auto:good' })
    : buildBunnyUrl(publicId, { quality: 'auto:good' });
};

/**
 * Get a signed URL after verifying ownership.
 * Returns null if access is denied.
 */
export const getSignedUrlIfAuthorized = async (
  userId: string,
  publicId: string,
  userRole?: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<{ url: string; fileRecord: IFileRecord } | null> => {
  const fileRecord = await checkFileAccess(userId, publicId, userRole);

  if (!fileRecord) {
    return null;
  }

  const url = generateSignedUrl(publicId, resourceType, fileRecord.fileType);
  return { url, fileRecord };
};

/**
 * Get all files owned by a user, optionally filtered by type.
 */
export const getUserFiles = async (
  userId: string,
  fileType?: IFileRecord['fileType'],
  page: number = 1,
  limit: number = 50
): Promise<{ files: IFileRecord[]; total: number }> => {
  const filter: any = { userId };
  if (fileType) {
    filter.fileType = fileType;
  }

  const [files, total] = await Promise.all([
    FileRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    FileRecord.countDocuments(filter),
  ]);

  return { files: files as unknown as IFileRecord[], total };
};

/**
 * Remove a file record (called when a file is deleted from Cloudinary).
 */
export const removeFileRecord = async (publicId: string): Promise<void> => {
  await FileRecord.deleteOne({ publicId });
  mediaLogger.info(`Removed file record: ${safeLog(publicId)}`);
};

/**
 * Remove all file records for a user (called when user account is deleted).
 */
export const removeAllUserFileRecords = async (userId: string): Promise<void> => {
  const result = await FileRecord.deleteMany({ userId });
  mediaLogger.info(`Removed ${result.deletedCount} file records for user ${safeLog(userId)}`);
};

/**
 * Transfer file ownership (e.g., when a property changes hands).
 */
export const transferFileOwnership = async (
  publicId: string,
  newOwnerId: string
): Promise<void> => {
  await FileRecord.updateOne({ publicId }, { userId: newOwnerId });
  mediaLogger.info(`Transferred file ownership: ${safeLog(publicId)} -> ${safeLog(newOwnerId)}`);
};

/**
 * Batch generate signed URLs for multiple files owned by the same user.
 * Only returns URLs for files the user owns.
 */
export const batchGetSignedUrls = async (
  userId: string,
  publicIds: string[],
  userRole?: string
): Promise<Record<string, string>> => {
  if (publicIds.length === 0) return {};

  // Fetch all records in one query
  const records = await FileRecord.find({ publicId: { $in: publicIds } }).lean();

  const signedUrls: Record<string, string> = {};

  for (const record of records) {
    const isOwner = record.userId.toString() === userId;
    const isAdmin = userRole === 'admin';

    if (isOwner || isAdmin) {
      signedUrls[record.publicId] = generateSignedUrl(record.publicId, 'image', record.fileType);
    }
  }

  return signedUrls;
};
