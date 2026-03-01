/**
 * ID Obfuscation Utility
 *
 * Converts MongoDB ObjectIds (24-char hex) into opaque, URL-safe strings
 * so that raw database IDs are never exposed in API responses or browser URLs.
 *
 * This is obfuscation (not encryption). It prevents casual inspection of IDs
 * in DevTools but is NOT a substitute for proper authorization checks.
 * Every endpoint must still verify that the requesting user has access.
 *
 * Encoding: hex → bytes → XOR with fixed key → base64url (16 chars)
 */

// 12-byte XOR key — same length as a MongoDB ObjectId's binary representation.
// Changing this key will invalidate all previously-issued encoded IDs,
// so treat it as a stable application secret.
const XOR_KEY = Buffer.from([
  0x42, 0x34, 0x6c, 0x6b, 0x34, 0x6e, 0x45, 0x73, 0x74, 0x34, 0x74, 0x65,
]); // "B4lk4nEst4te"

/**
 * Encode a 24-char hex MongoDB ObjectId into a 16-char base64url string.
 */
export const encodeId = (hexId: string): string => {
  if (!hexId || typeof hexId !== 'string') return hexId;

  // Only encode valid 24-char hex strings (MongoDB ObjectIds)
  if (!/^[a-fA-F0-9]{24}$/.test(hexId)) return hexId;

  const bytes = Buffer.from(hexId, 'hex'); // 12 bytes
  const xored = Buffer.alloc(12);
  for (let i = 0; i < 12; i++) {
    xored[i] = bytes[i] ^ XOR_KEY[i];
  }
  return xored.toString('base64url'); // 16 chars, URL-safe
};

/**
 * Decode a 16-char base64url string back into a 24-char hex MongoDB ObjectId.
 * Returns null if the input is not a valid encoded ID.
 */
export const decodeId = (encoded: string): string | null => {
  if (!encoded || typeof encoded !== 'string') return null;

  // Encoded IDs are always exactly 16 base64url characters
  if (!/^[A-Za-z0-9_-]{16}$/.test(encoded)) return null;

  try {
    const xored = Buffer.from(encoded, 'base64url');
    if (xored.length !== 12) return null;

    const bytes = Buffer.alloc(12);
    for (let i = 0; i < 12; i++) {
      bytes[i] = xored[i] ^ XOR_KEY[i];
    }
    const hex = bytes.toString('hex');

    // Sanity check: result must be a valid 24-char hex string
    if (!/^[a-f0-9]{24}$/.test(hex)) return null;
    return hex;
  } catch {
    return null;
  }
};

/**
 * Resolve an ID parameter that may be:
 * 1. A raw 24-char hex MongoDB ObjectId (backward compatibility)
 * 2. A 16-char base64url encoded ID
 * 3. An SEO slug ending with an encoded ID suffix (e.g. "3-bed-apt-in-budva_AbCdEfGhIjKlMnOp")
 *
 * Returns the raw hex ObjectId, or null if unrecognizable.
 */
export const resolveId = (param: string): string | null => {
  if (!param) return null;

  // 1. Raw MongoDB ObjectId (24-char hex)
  if (/^[a-fA-F0-9]{24}$/.test(param)) return param;

  // 2. Encoded ID (16-char base64url)
  const decoded = decodeId(param);
  if (decoded) return decoded;

  // 3. Slug with encoded ID suffix after underscore: "slug-text_EncodedId1234"
  const underscoreIdx = param.lastIndexOf('_');
  if (underscoreIdx > 0) {
    const suffix = param.slice(underscoreIdx + 1);
    const fromSuffix = decodeId(suffix);
    if (fromSuffix) return fromSuffix;
  }

  return null;
};
