import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { REFRESH_TOKEN_EXPIRES_IN } from '../config/authConstants';

// Get JWT secret - MUST be set in environment variables
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is not set. Application cannot start without it.');
  }
  return secret;
};

// Get JWT refresh secret - falls back to JWT_SECRET if not set separately
const getJwtRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: JWT_SECRET or JWT_REFRESH_SECRET environment variable is not set. Application cannot start without it.');
  }
  return secret;
};

// Access token: Medium-lived (1 hour) - extended for better UX while maintaining security
export const generateAccessToken = (userId: string): string => {
  const secret: string = getJwtSecret();
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '1h';
  return jwt.sign({ id: userId, type: 'access' }, secret, { expiresIn } as any);
};

// Refresh token: Long-lived (7 days)
export const generateRefreshToken = (userId: string): string => {
  const secret: string = getJwtRefreshSecret();
  const expiresIn = REFRESH_TOKEN_EXPIRES_IN;

  // Generate a unique token identifier to allow revocation
  const tokenId = crypto.randomBytes(32).toString('hex');

  return jwt.sign(
    { id: userId, type: 'refresh', tokenId },
    secret,
    { expiresIn } as any
  );
};

// Verify access token
export const verifyAccessToken = (token: string): any => {
  const secret: string = getJwtSecret();
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === 'object' && decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

// Verify refresh token
export const verifyRefreshToken = (token: string): any => {
  const secret: string = getJwtRefreshSecret();
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === 'object' && decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

// Legacy function for backward compatibility
export const generateToken = (userId: string): string => {
  return generateAccessToken(userId);
};

// Legacy function for backward compatibility
// Accepts tokens without a type field (old tokens) but rejects refresh tokens
export const verifyToken = (token: string): any => {
  try {
    return verifyAccessToken(token);
  } catch {
    // Fallback for old tokens without type field - but reject refresh tokens
    const secret: string = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'object' && decoded.type === 'refresh') {
      throw new Error('Refresh tokens cannot be used as access tokens');
    }
    return decoded;
  }
};

// Decode token without verification (useful for expired token checks)
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

// Calculate token expiration date
export const getTokenExpirationDate = (expiresIn: string): Date => {
  const now = Date.now();
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('Invalid expiration format');
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let milliseconds = 0;
  switch (unit) {
    case 's':
      milliseconds = value * 1000;
      break;
    case 'm':
      milliseconds = value * 60 * 1000;
      break;
    case 'h':
      milliseconds = value * 60 * 60 * 1000;
      break;
    case 'd':
      milliseconds = value * 24 * 60 * 60 * 1000;
      break;
  }

  return new Date(now + milliseconds);
};
