/**
 * Client-Side Payload Encryption
 *
 * Encrypts sensitive form fields (password, email) with the server's RSA public key
 * before sending them over the network. This way, even if someone inspects the
 * network request (browser dev tools, proxy, etc.), they see ciphertext instead
 * of plaintext credentials.
 *
 * How it works:
 * 1. Frontend fetches the server's RSA public key from /api/auth/encryption-key
 * 2. Sensitive fields are encrypted with RSA-OAEP in the browser
 * 3. Encrypted fields are sent as __enc_<fieldName> in the request body
 * 4. Server middleware decrypts them back to the original field names
 *
 * The key is cached in memory and refreshed periodically.
 */

import { API_URL } from './config';

let cachedPublicKey: CryptoKey | null = null;
let cachedKeyTimestamp = 0;
const KEY_CACHE_TTL = 30 * 60 * 1000; // Refresh key every 30 minutes

/**
 * Fetch and import the server's RSA public key
 */
const getServerPublicKey = async (): Promise<CryptoKey> => {
  const now = Date.now();

  // Return cached key if still valid
  if (cachedPublicKey && (now - cachedKeyTimestamp) < KEY_CACHE_TTL) {
    return cachedPublicKey;
  }

  const response = await fetch(`${API_URL}/auth/encryption-key`);
  if (!response.ok) {
    throw new Error('Failed to fetch encryption key');
  }

  const { publicKey } = await response.json();

  // Convert base64 DER to ArrayBuffer
  const binaryString = atob(publicKey);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Import as RSA-OAEP public key
  cachedPublicKey = await crypto.subtle.importKey(
    'spki',
    bytes.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  );
  cachedKeyTimestamp = now;

  return cachedPublicKey;
};

/**
 * Encrypt a single string value with the server's public key
 * Returns base64-encoded ciphertext
 */
const encryptValue = async (value: string): Promise<string> => {
  const key = await getServerPublicKey();
  const encoded = new TextEncoder().encode(value);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    encoded,
  );

  // Convert ArrayBuffer to base64
  const bytes = new Uint8Array(encrypted);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Encrypt sensitive fields in a request body.
 *
 * Takes the body object and a list of field names to encrypt.
 * Encrypted fields are renamed to __enc_<fieldName>.
 * Non-encrypted fields pass through unchanged.
 *
 * Falls back to plaintext if encryption fails (e.g., browser doesn't support Web Crypto).
 */
export const encryptSensitiveFields = async (
  body: Record<string, any>,
  fieldsToEncrypt: string[],
): Promise<Record<string, any>> => {
  // Check if Web Crypto API is available
  if (!crypto?.subtle) {
    return body;
  }

  try {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      if (fieldsToEncrypt.includes(key) && typeof value === 'string' && value.length > 0) {
        result[`__enc_${key}`] = await encryptValue(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  } catch {
    // If encryption fails, send plaintext (HTTPS still protects the transport)
    return body;
  }
};
