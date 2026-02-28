import { Request, Response } from 'express';
import { IUser } from '../models/User';
import {
  getSignedUrlIfAuthorized,
  getUserFiles,
  batchGetSignedUrls,
  removeFileRecord,
  isFileOwner,
} from '../services/storageAccessPolicy';
import { deleteImage } from '../services/cloudinaryService';
import { mediaLogger } from '../utils/logger';

/**
 * @desc    Get a signed URL for a file (ownership check)
 * @route   GET /api/files/signed-url/:publicId
 * @access  Private
 */
export const getSignedUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // publicId comes from wildcard route (e.g. /signed-url/balkan-estate/users/123/avatar/img)
    const publicId = req.params[0];
    if (!publicId) {
      res.status(400).json({ message: 'publicId is required' });
      return;
    }

    const decodedPublicId = decodeURIComponent(publicId);
    const user = req.user as IUser;
    const resourceType = (req.query.resourceType as 'image' | 'video' | 'raw') || 'image';

    const result = await getSignedUrlIfAuthorized(
      String(user._id),
      decodedPublicId,
      user.role,
      resourceType
    );

    if (!result) {
      res.status(403).json({ message: 'You do not have permission to access this file' });
      return;
    }

    res.json({
      url: result.url,
      fileType: result.fileRecord.fileType,
      expiresIn: 3600,
    });
  } catch (error: any) {
    mediaLogger.error('Error getting signed URL:', error);
    res.status(500).json({ message: 'Error generating file access URL' });
  }
};

/**
 * @desc    Batch get signed URLs for multiple files
 * @route   POST /api/files/signed-urls
 * @access  Private
 */
export const getBatchSignedUrls = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { publicIds } = req.body;
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      res.status(400).json({ message: 'publicIds array is required' });
      return;
    }

    if (publicIds.length > 100) {
      res.status(400).json({ message: 'Maximum 100 files per batch request' });
      return;
    }

    const user = req.user as IUser;
    const signedUrls = await batchGetSignedUrls(
      String(user._id),
      publicIds,
      user.role
    );

    res.json({ urls: signedUrls });
  } catch (error: any) {
    mediaLogger.error('Error getting batch signed URLs:', error);
    res.status(500).json({ message: 'Error generating file access URLs' });
  }
};

/**
 * @desc    List current user's files
 * @route   GET /api/files/my
 * @access  Private
 */
export const getMyFiles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = req.user as IUser;
    const fileType = req.query.fileType as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const validTypes = ['property', 'floorplan', 'avatar', 'license', 'credential', 'agency-logo', 'agency-cover', 'conversation', 'video', 'other'];
    const typedFileType = fileType && validTypes.includes(fileType)
      ? fileType as any
      : undefined;

    const { files, total } = await getUserFiles(String(user._id), typedFileType, page, limit);

    res.json({
      files,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    mediaLogger.error('Error listing files:', error);
    res.status(500).json({ message: 'Error listing files' });
  }
};

/**
 * @desc    Delete a file (ownership check)
 * @route   DELETE /api/files/:publicId
 * @access  Private
 */
export const deleteFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // publicId comes from wildcard route (e.g. /balkan-estate/users/123/avatar/img)
    const publicId = req.params[0];
    if (!publicId) {
      res.status(400).json({ message: 'publicId is required' });
      return;
    }

    const decodedPublicId = decodeURIComponent(publicId);
    const user = req.user as IUser;

    // Check ownership (admins can also delete)
    const ownerOrAdmin = await isFileOwner(String(user._id), decodedPublicId) || user.role === 'admin';
    if (!ownerOrAdmin) {
      res.status(403).json({ message: 'You do not have permission to delete this file' });
      return;
    }

    // Delete from Cloudinary and remove the record
    await deleteImage(decodedPublicId);
    await removeFileRecord(decodedPublicId);

    res.json({ message: 'File deleted successfully' });
  } catch (error: any) {
    mediaLogger.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
};
