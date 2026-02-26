import crypto from 'crypto';
import { authLogger } from './logger';

/**
 * Payload Encryption Service
 *
 * Provides RSA-OAEP encryption for sensitive request payloads.
 * The frontend encrypts sensitive fields (password, email) with the server's
 * RSA public key. The backend decrypts them before processing.
 *
 * This ensures sensitive data is encrypted end-to-end even if TLS is
 * intercepted (MITM proxy, browser dev tools network tab, etc.).
 *
 * Key rotation: Keys automatically rotate every 24 hours. The previous key
 * is kept for a grace period to handle in-flight requests encrypted with the
 * old key. The frontend's 30-minute key cache will pick up the new key.
 */

const KEY_SIZE = 2048;
const PADDING = crypto.constants.RSA_PKCS1_OAEP_PADDING;
const OAEP_HASH = 'sha256';

// Key rotation interval: 24 hours
const KEY_ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface KeyPair {
  privateKey: string;
  publicKeyBase64: string;
  createdAt: number;
}

// Current and previous key pairs (previous kept for in-flight requests during rotation)
let currentKeyPair: KeyPair | null = null;
let previousKeyPair: KeyPair | null = null;
let rotationTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Generate a new RSA key pair
 */
const generateNewKeyPair = (): KeyPair => {
  const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
    modulusLength: KEY_SIZE,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Convert PEM to base64 DER for the frontend (Web Crypto API needs this format)
  const publicKeyBase64 = pub
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\n/g, '');

  return { privateKey: priv, publicKeyBase64, createdAt: Date.now() };
};

/**
 * Rotate keys: current becomes previous, new key generated
 */
const rotateKeys = (): void => {
  previousKeyPair = currentKeyPair;
  currentKeyPair = generateNewKeyPair();
  authLogger.info('RSA key pair rotated for payload encryption');
};

/**
 * Initialize RSA key pair on server start and schedule automatic rotation
 */
export const initializeKeyPair = (): void => {
  currentKeyPair = generateNewKeyPair();
  authLogger.info('RSA key pair initialized for payload encryption');

  // Schedule automatic key rotation
  if (rotationTimer) clearInterval(rotationTimer);
  rotationTimer = setInterval(rotateKeys, KEY_ROTATION_INTERVAL_MS);
};

/**
 * Get the public key in base64 DER format (for Web Crypto API)
 */
export const getPublicKeyBase64 = (): string => {
  if (!currentKeyPair) {
    initializeKeyPair();
  }
  return currentKeyPair!.publicKeyBase64;
};

/**
 * Try to decrypt with a specific private key
 */
const tryDecrypt = (encryptedBuffer: Buffer, privKey: string): Buffer => {
  return crypto.privateDecrypt(
    {
      key: privKey,
      padding: PADDING,
      oaepHash: OAEP_HASH,
    },
    encryptedBuffer,
  );
};

/**
 * Decrypt a value that was encrypted with our public key.
 * Tries the current key first, then falls back to the previous key
 * to handle in-flight requests during key rotation.
 */
export const decryptPayloadValue = (encryptedBase64: string): string => {
  if (!currentKeyPair) {
    initializeKeyPair();
  }

  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');

  // Try current key first
  try {
    return tryDecrypt(encryptedBuffer, currentKeyPair!.privateKey).toString('utf8');
  } catch {
    // Fall back to previous key (for in-flight requests during rotation)
    if (previousKeyPair) {
      try {
        return tryDecrypt(encryptedBuffer, previousKeyPair.privateKey).toString('utf8');
      } catch {
        // Both keys failed
      }
    }
    throw new Error('Failed to decrypt payload');
  }
};

/**
 * Decrypt a value to raw Buffer (for AES key decryption).
 * Tries current key first, then falls back to previous key.
 */
export const decryptPayloadRaw = (encryptedBase64: string): Buffer => {
  if (!currentKeyPair) {
    initializeKeyPair();
  }

  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');

  try {
    return tryDecrypt(encryptedBuffer, currentKeyPair!.privateKey);
  } catch {
    if (previousKeyPair) {
      try {
        return tryDecrypt(encryptedBuffer, previousKeyPair.privateKey);
      } catch {
        // Both keys failed
      }
    }
    throw new Error('Failed to decrypt payload');
  }
};

/**
 * Check if a string value looks like an encrypted payload
 * Encrypted values are base64 strings of RSA ciphertext (256+ bytes for 2048-bit key)
 */
export const isEncryptedPayload = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  // RSA-2048 produces 256 bytes = ~344 base64 chars
  if (value.length < 100) return false;
  // Check if it's valid base64
  return /^[A-Za-z0-9+/]+=*$/.test(value);
};

/**
 * Decrypt sensitive fields in a request body
 * Fields prefixed with __encrypted__ are decrypted and the prefix is removed
 */
export const decryptRequestBody = (body: Record<string, any>): Record<string, any> => {
  if (!body || typeof body !== 'object') return body;

  const decrypted: Record<string, any> = {};

  for (const [key, value] of Object.entries(body)) {
    if (key.startsWith('__enc_') && typeof value === 'string') {
      // Strip prefix and decrypt
      const realKey = key.replace('__enc_', '');
      try {
        decrypted[realKey] = decryptPayloadValue(value);
      } catch {
        authLogger.warn(`Failed to decrypt field: ${realKey}`);
        throw new Error('Invalid encrypted payload');
      }
    } else {
      decrypted[key] = value;
    }
  }

  return decrypted;
};
