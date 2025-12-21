import crypto from 'crypto';
import User, { IUser } from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpirationDate,
} from '../utils/jwt';

/**
 * Refresh Token Service
 *
 * Security Design:
 * - Refresh tokens stored in database (allows revocation)
 * - Each refresh token has expiration date
 * - Automatic rotation on use (prevents token replay)
 * - Device tracking for security monitoring
 * - Maximum concurrent sessions per user
 * - Automatic cleanup of expired tokens
 */

const MAX_REFRESH_TOKENS_PER_USER = 5; // Maximum devices/sessions
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = async (
  user: IUser,
  deviceInfo?: DeviceInfo
): Promise<TokenPair> => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Calculate expiration date
  const expiresAt = getTokenExpirationDate(REFRESH_TOKEN_EXPIRY);

  // Hash refresh token before storing
  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Add refresh token to user's tokens array
  if (!user.refreshTokens) {
    user.refreshTokens = [];
  }

  user.refreshTokens.push({
    token: hashedToken,
    createdAt: new Date(),
    expiresAt,
    deviceInfo: deviceInfo?.userAgent,
    ipAddress: deviceInfo?.ipAddress,
  });

  // Enforce maximum tokens limit (FIFO - remove oldest)
  if (user.refreshTokens.length > MAX_REFRESH_TOKENS_PER_USER) {
    // Sort by creation date and remove oldest
    user.refreshTokens.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    user.refreshTokens = user.refreshTokens.slice(-MAX_REFRESH_TOKENS_PER_USER);
  }

  await user.save();

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verify and rotate refresh token
 */
export const refreshAccessToken = async (
  refreshToken: string,
  deviceInfo?: DeviceInfo
): Promise<{ success: boolean; accessToken?: string; refreshToken?: string; error?: string }> => {
  try {
    // Verify refresh token signature
    const decoded = verifyRefreshToken(refreshToken);

    // Hash the token to match against stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Find user with this refresh token
    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': hashedToken,
    });

    if (!user) {
      return {
        success: false,
        error: 'Invalid refresh token',
      };
    }

    // Find the specific token in user's tokens array
    const tokenIndex = user.refreshTokens!.findIndex(
      (t) => t.token === hashedToken
    );

    if (tokenIndex === -1) {
      return {
        success: false,
        error: 'Refresh token not found',
      };
    }

    const storedToken = user.refreshTokens![tokenIndex];

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Remove expired token
      user.refreshTokens!.splice(tokenIndex, 1);
      await user.save();

      return {
        success: false,
        error: 'Refresh token expired',
      };
    }

    // Token is valid - perform rotation
    // Remove old refresh token
    user.refreshTokens!.splice(tokenIndex, 1);
    await user.save();

    // Generate new token pair
    const tokens = await generateTokenPair(user, deviceInfo);

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    console.error('Refresh token error:', error);
    return {
      success: false,
      error: 'Invalid or expired refresh token',
    };
  }
};

/**
 * Revoke a specific refresh token
 */
export const revokeRefreshToken = async (
  userId: string,
  refreshToken: string
): Promise<boolean> => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const user = await User.findById(userId);
    if (!user || !user.refreshTokens) {
      return false;
    }

    // Remove the token
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.token !== hashedToken
    );

    await user.save();
    return true;
  } catch (error) {
    console.error('Error revoking refresh token:', error);
    return false;
  }
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export const revokeAllRefreshTokens = async (userId: string): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return false;
    }

    user.refreshTokens = [];
    await user.save();
    return true;
  } catch (error) {
    console.error('Error revoking all refresh tokens:', error);
    return false;
  }
};

/**
 * Clean up expired refresh tokens for a user
 */
export const cleanupExpiredTokens = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.refreshTokens) {
      return;
    }

    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter(
      (t) => t.expiresAt > now
    );

    await user.save();
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
};

/**
 * Get active sessions for a user
 */
export const getActiveSessions = async (userId: string): Promise<any[]> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.refreshTokens) {
      return [];
    }

    const now = new Date();

    return user.refreshTokens
      .filter((t) => t.expiresAt > now)
      .map((t) => ({
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        deviceInfo: t.deviceInfo,
        ipAddress: t.ipAddress,
      }));
  } catch (error) {
    console.error('Error getting active sessions:', error);
    return [];
  }
};

/**
 * Clean up all expired tokens across all users (run periodically)
 */
export const cleanupAllExpiredTokens = async (): Promise<number> => {
  try {
    const now = new Date();

    const result = await User.updateMany(
      {
        'refreshTokens.expiresAt': { $lt: now },
      },
      {
        $pull: {
          refreshTokens: { expiresAt: { $lt: now } },
        },
      }
    );

    return result.modifiedCount || 0;
  } catch (error) {
    console.error('Error cleaning up all expired tokens:', error);
    return 0;
  }
};

/**
 * Check if token was issued after password change (security check)
 */
export const isTokenValidAfterPasswordChange = (
  user: IUser,
  tokenIssuedAt: number
): boolean => {
  if (!user.passwordChangedAt) {
    return true;
  }

  const passwordChangedTimestamp = Math.floor(
    user.passwordChangedAt.getTime() / 1000
  );

  return tokenIssuedAt > passwordChangedTimestamp;
};
