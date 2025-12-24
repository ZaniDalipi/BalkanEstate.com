import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import User from '../models/User';

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: string;
    };

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ message: 'Not authorized, user not found', code: 'USER_NOT_FOUND' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
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
