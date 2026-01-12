import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import User from '../models/User';
import { verifyFingerprint, generateFingerprint } from '../utils/tokenFingerprint';
import { activityLogger } from '../services/activityLogger';

// Get JWT secret - MUST be set in environment variables
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is not set.');
  }
  return secret;
};

// Check if fingerprint verification is enabled
const isFingerprintEnabled = (): boolean => {
  return process.env.ENABLE_TOKEN_FINGERPRINT === 'true';
};

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({ message: 'Not authorized, no token', code: 'NO_TOKEN' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: string;
      fingerprint?: string;
    };

    // Verify fingerprint if enabled and present in token
    if (isFingerprintEnabled() && decoded.fingerprint) {
      if (!verifyFingerprint(req, decoded.fingerprint)) {
        // Log potential token theft
        activityLogger.logSuspiciousActivity('token_fingerprint_mismatch', {
          userId: decoded.id,
          expectedFingerprint: decoded.fingerprint,
          actualFingerprint: generateFingerprint(req),
        }, req);

        res.status(401).json({
          message: 'Security validation failed. Please login again.',
          code: 'FINGERPRINT_MISMATCH'
        });
        return;
      }
    }

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found', code: 'USER_NOT_FOUND' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        message: 'Session expired, please login again',
        code: 'TOKEN_EXPIRED'
      });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({
        message: 'Invalid token, please login again',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    res.status(401).json({ message: 'Not authorized, token failed', code: 'AUTH_FAILED' });
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: 'You do not have permission to perform this action',
      });
      return;
    }
    next();
  };
};

/**
 * Middleware to require email verification
 * Must be used AFTER the protect middleware
 * Returns 403 with EMAIL_NOT_VERIFIED code if user hasn't verified their email
 */
export const requireVerifiedEmail = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Not authorized', code: 'NO_USER' });
    return;
  }

  // OAuth users (Google, Apple) are automatically verified
  if (req.user.provider && req.user.provider !== 'local') {
    next();
    return;
  }

  // Check if email is verified
  if (!req.user.isEmailVerified) {
    res.status(403).json({
      message: 'Please verify your email address to continue',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  next();
};

/**
 * Optional authentication middleware
 * Attaches user to request if valid token is present, but doesn't block unauthenticated requests
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      // Verify token
      const decoded = jwt.verify(token, getJwtSecret()) as {
        id: string;
      };

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (user) {
        req.user = user;
      }
    }

    // Always continue to next middleware, even if no token
    next();
  } catch {
    // Token invalid or expired - continue without user
    next();
  }
};
