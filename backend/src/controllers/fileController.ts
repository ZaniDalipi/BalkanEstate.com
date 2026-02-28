import { Request, Response } from 'express';
import { IUser } from '../models/User';
import {
  getSignedUrlIfAuthorized,
  getUserFiles,
  batchGetSignedUrls,
  isFileOwner,
} from '../services/storageAccessPolicy';
import { deleteImage } from '../services/cloudinaryService';
import { mediaLogger } from '../utils/logger';

// Matches valid Cloudinary public IDs: alphanumeric, hyphens, underscores, slashes, dots
const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9_\-/.]+$/;
const MAX_PUBLIC_ID_LENGTH = 512;

const ALLOWED_RESOURCE_TYPES = ['image', 'video', 'raw'] as const;
type ResourceType = (typeof ALLOWED_RESOURCE_TYPES)[number];

/**
 * Sanitize a publicId for safe use in queries and logs.
 * Returns null if the input is invalid.
 */
const sanitizePublicId = (raw: string): string | null => {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.length > MAX_PUBLIC_ID_LENGTH) return null;
  if (!PUBLIC_ID_PATTERN.test(raw)) return null;
  // Block path traversal
  if (raw.includes('..')) return null;
  return raw;
};

/**
 * Extract publicId from route params.
 * path-to-regexp v8 wildcards ({*publicId}) return an array of path segments.
 */
const extractPublicId = (params: Record<string, any>): string => {
  const raw = params.publicId ?? params[0] ?? '';
  if (Array.isArray(raw)) return raw.join('/');
  return String(raw);
};

/**
 * Validate resourceType query param against whitelist.
 */
const parseResourceType = (raw: unknown): ResourceType => {
  if (typeof raw === 'string' && ALLOWED_RESOURCE_TYPES.includes(raw as ResourceType)) {
    return raw as ResourceType;
  }
  return 'image';
};

/**
 * @desc    Get a signed URL for a file (ownership check)
 * @route   GET /api/files/signed-url/*
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

    // publicId comes from named wildcard route param (e.g. /signed-url/balkan-estate/users/123/avatar/img)
    const rawPublicId = extractPublicId(req.params);
    const publicId = sanitizePublicId(rawPublicId);
    if (!publicId) {
      res.status(400).json({ message: 'Invalid or missing publicId' });
      return;
    }

    const user = req.user as IUser;
    const resourceType = parseResourceType(req.query.resourceType);

    const result = await getSignedUrlIfAuthorized(
      String(user._id),
      publicId,
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

    // Validate every item is a safe string (prevents NoSQL injection with {$gt:""} objects)
    const sanitized: string[] = [];
    for (const id of publicIds) {
      const clean = sanitizePublicId(id);
      if (!clean) {
        res.status(400).json({ message: 'Invalid publicId in array' });
        return;
      }
      sanitized.push(clean);
    }

    const user = req.user as IUser;
    const signedUrls = await batchGetSignedUrls(
      String(user._id),
      sanitized,
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
 * @route   DELETE /api/files/*
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

    // publicId comes from named wildcard route param (e.g. /balkan-estate/users/123/avatar/img)
    const rawPublicId = extractPublicId(req.params);
    const publicId = sanitizePublicId(rawPublicId);
    if (!publicId) {
      res.status(400).json({ message: 'Invalid or missing publicId' });
      return;
    }

    const user = req.user as IUser;

    // Check ownership (admins can also delete)
    const ownerOrAdmin = await isFileOwner(String(user._id), publicId) || user.role === 'admin';
    if (!ownerOrAdmin) {
      res.status(403).json({ message: 'You do not have permission to delete this file' });
      return;
    }

    // deleteImage already removes the FileRecord internally — no double call
    await deleteImage(publicId);

    res.json({ message: 'File deleted successfully' });
  } catch (error: any) {
    mediaLogger.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
};
