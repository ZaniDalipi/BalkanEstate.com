import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Access token: Short-lived (15 minutes)
export const generateAccessToken = (userId: string): string => {
  const secret: string = process.env.JWT_SECRET || 'secret';
  const expiresIn: any = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
  return jwt.sign({ id: userId, type: 'access' }, secret, { expiresIn });
};

// Refresh token: Long-lived (7 days)
export const generateRefreshToken = (userId: string): string => {
  const secret: string = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
  const expiresIn: any = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  // Generate a unique token identifier to allow revocation
  const tokenId = crypto.randomBytes(32).toString('hex');

  return jwt.sign(
    { id: userId, type: 'refresh', tokenId },
    secret,
    { expiresIn }
  );
};

// Verify access token
export const verifyAccessToken = (token: string): any => {
  const secret: string = process.env.JWT_SECRET || 'secret';
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === 'object' && decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }

  return decoded;
};

// Verify refresh token
export const verifyRefreshToken = (token: string): any => {
  const secret: string = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'secret';
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
export const verifyToken = (token: string): any => {
  try {
    return verifyAccessToken(token);
  } catch {
    // Fallback for old tokens without type field
    const secret: string = process.env.JWT_SECRET || 'secret';
    return jwt.verify(token, secret);
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
