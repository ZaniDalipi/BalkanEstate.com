import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { resolveId } from './idObfuscation';

/**
 * Extract a route param as a string.
 * Express types req.params values as string | string[]; this narrows to string.
 */
export const getParam = (req: Request, name: string): string => {
  return req.params[name] as string;
};

/**
 * Validate that a string is a valid MongoDB ObjectId.
 */
export const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id) && /^[a-fA-F0-9]{24}$/.test(id);
};

/**
 * Extract a route param and validate it as a MongoDB ObjectId.
 * Accepts both raw 24-char hex ObjectIds and obfuscated encoded IDs.
 * Returns the raw hex ObjectId if valid, or sends a 400 response and returns null.
 */
export const getObjectIdParam = (
  req: Request,
  res: Response,
  name: string
): string | null => {
  const value = req.params[name] as string;
  if (!value) {
    res.status(400).json({ message: `Invalid ${name} format` });
    return null;
  }

  // Try resolving: supports raw hex, encoded base64url, and slug suffixes
  const resolved = resolveId(value);
  if (resolved && isValidObjectId(resolved)) {
    return resolved;
  }

  res.status(400).json({ message: `Invalid ${name} format` });
  return null;
};
