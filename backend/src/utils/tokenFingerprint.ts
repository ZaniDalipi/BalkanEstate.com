import crypto from 'crypto';
import { Request } from 'express';

/**
 * Token Fingerprinting Service
 *
 * Creates a fingerprint based on client characteristics to bind tokens
 * to specific clients and detect token theft.
 *
 * Components used:
 * - User-Agent
 * - Accept-Language
 * - Client IP (with consideration for proxies)
 * - Custom client identifier (if provided)
 */

// Get fingerprint secret
const getFingerprintSecret = (): string => {
  const secret = process.env.FINGERPRINT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('CRITICAL: FINGERPRINT_SECRET or JWT_SECRET not set.');
  }
  return secret;
};

/**
 * Extract client IP considering proxies
 */
export function getClientIp(req: Request): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // Get the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Generate a fingerprint hash from request characteristics
 */
export function generateFingerprint(req: Request): string {
  const components = [
    req.headers['user-agent'] || 'unknown',
    req.headers['accept-language'] || 'unknown',
    // Include partial IP for location binding (first 3 octets for IPv4)
    getPartialIp(getClientIp(req)),
  ];

  const data = components.join('|');
  const secret = getFingerprintSecret();

  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
    .substring(0, 32); // Truncate for shorter tokens
}

/**
 * Get partial IP (for privacy while maintaining location binding)
 * IPv4: Returns first 3 octets (e.g., "192.168.1")
 * IPv6: Returns first 4 groups
 */
function getPartialIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return parts.slice(0, 3).join('.');
  }

  // IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 4).join(':');
  }

  return ip;
}

/**
 * Generate a fingerprint for storing in token
 * This is a shorter hash suitable for JWT payload
 */
export function generateTokenFingerprint(req: Request): string {
  return generateFingerprint(req);
}

/**
 * Verify if a request matches a fingerprint
 * Returns true if fingerprint matches, false otherwise
 */
export function verifyFingerprint(req: Request, storedFingerprint: string): boolean {
  if (!storedFingerprint) return true; // Skip if no fingerprint stored (legacy tokens)

  const currentFingerprint = generateFingerprint(req);

  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(currentFingerprint),
      Buffer.from(storedFingerprint)
    );
  } catch {
    return false;
  }
}

/**
 * Calculate fingerprint similarity score (0-100)
 * Useful for soft validation where you might allow minor changes
 */
export function fingerprintSimilarity(req: Request, storedFingerprint: string): number {
  if (!storedFingerprint) return 100;

  const currentFingerprint = generateFingerprint(req);

  // If exact match
  if (currentFingerprint === storedFingerprint) return 100;

  // Calculate character-level similarity
  let matches = 0;
  const minLength = Math.min(currentFingerprint.length, storedFingerprint.length);

  for (let i = 0; i < minLength; i++) {
    if (currentFingerprint[i] === storedFingerprint[i]) {
      matches++;
    }
  }

  return Math.round((matches / minLength) * 100);
}

/**
 * Generate device info object for logging
 */
export function getDeviceInfo(req: Request): {
  userAgent: string;
  ip: string;
  language: string;
  fingerprint: string;
} {
  return {
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: getClientIp(req),
    language: req.headers['accept-language']?.split(',')[0] || 'unknown',
    fingerprint: generateFingerprint(req),
  };
}

/**
 * Create a secure session ID
 */
export function generateSecureSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a session ID for storage
 */
export function hashSessionId(sessionId: string): string {
  return crypto
    .createHash('sha256')
    .update(sessionId + getFingerprintSecret())
    .digest('hex');
}

export default {
  generateFingerprint,
  generateTokenFingerprint,
  verifyFingerprint,
  fingerprintSimilarity,
  getClientIp,
  getDeviceInfo,
  generateSecureSessionId,
  hashSessionId,
};
