/**
 * Secure Random ID Generation Utilities
 *
 * Uses crypto.randomBytes for cryptographically secure random values
 * instead of Math.random() which is predictable.
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the random string
 * @param charset - Character set to use (default: alphanumeric uppercase)
 */
export function generateSecureRandomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
): string {
  const bytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }

  return result;
}

/**
 * Generate a secure agent ID
 * Format: AG-{timestamp}-{random}
 */
export function generateSecureAgentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateSecureRandomString(6);
  return `AG-${timestamp}-${random}`;
}

/**
 * Generate a secure discount code
 * Format: {prefix}-{random}
 */
export function generateSecureDiscountCode(prefix: string = 'DISC'): string {
  const random = generateSecureRandomString(8);
  return `${prefix}-${random}`;
}

/**
 * Generate a secure coupon code for agencies
 * Format: {agencyPrefix}-{random}
 */
export function generateSecureAgencyCouponCode(agencyName: string): string {
  // Create a short prefix from agency name (first 3 chars, uppercase, alphanumeric only)
  const prefix = agencyName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');

  const random = generateSecureRandomString(8);
  return `${prefix}-${random}`;
}

/**
 * Generate a secure measurement ID
 * Format: m_{timestamp}_{random}
 */
export function generateSecureMeasurementId(): string {
  const timestamp = Date.now();
  const random = generateSecureRandomString(8).toLowerCase();
  return `m_${timestamp}_${random}`;
}

/**
 * Generate a secure token (for reset tokens, verification, etc.)
 * Returns a hex string of the specified byte length
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}
