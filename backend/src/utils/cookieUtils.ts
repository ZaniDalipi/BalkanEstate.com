import { Response, Request } from 'express';
import { REFRESH_TOKEN_TTL_MS } from '../config/authConstants';

/**
 * Utility for managing httpOnly refresh token cookies.
 *
 * The refresh token is stored as a Secure, HttpOnly, SameSite=Strict cookie
 * so it is never accessible to JavaScript and cannot be stolen via XSS.
 * The access token is still returned in the JSON response body because
 * it needs to be attached as a Bearer header (and used for WebSocket auth).
 */

const REFRESH_COOKIE_NAME = 'balkan_rt';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Set the refresh token as an httpOnly cookie on the response.
 */
export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  const maxAge = REFRESH_TOKEN_TTL_MS;

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // Lax in dev for localhost cross-port
    path: '/api/auth', // Only sent to auth endpoints
    maxAge,
  });
};

/**
 * Clear the refresh token cookie (on logout).
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth',
  });
};

/**
 * Read the refresh token from the httpOnly cookie.
 * Falls back to request body for backward compatibility with older clients.
 */
export const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  return req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
};
