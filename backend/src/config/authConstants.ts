/**
 * Auth token configuration — single source of truth for all TTL values.
 *
 * IMPORTANT: If you change REFRESH_TOKEN_TTL_MS here, you MUST also update
 * the frontend mirror constant SESSION_HINT_MAX_AGE_MS in:
 *   src/shared/api/tokenService.ts
 */

/** Default refresh token lifetime as a JWT-compatible duration string. */
export const REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

/** Same lifetime in milliseconds (used for cookie maxAge & DB expiry). */
export const REFRESH_TOKEN_TTL_MS = parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN);

/**
 * Parse a duration string like '7d', '24h', '30m', '60s' into milliseconds.
 * Throws on unrecognised formats so misconfiguration fails fast at startup.
 */
function parseDurationToMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid duration format "${duration}". Expected e.g. "7d", "24h", "30m", "60s".`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1_000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Unknown duration unit "${unit}".`);
  }
}
