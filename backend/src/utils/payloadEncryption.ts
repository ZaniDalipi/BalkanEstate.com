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
 * Key rotation: Keys are generated on server start and held in memory.
 * A new key pair is generated each time the server restarts.
 */

const KEY_SIZE = 2048;
const PADDING = crypto.constants.RSA_PKCS1_OAEP_PADDING;
const OAEP_HASH = 'sha256';

let privateKey: string;
let publicKeyPem: string;

/**
 * Initialize RSA key pair on server start
 */
export const initializeKeyPair = (): void => {
  const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
    modulusLength: KEY_SIZE,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  privateKey = priv;

  // Convert PEM to base64 DER for the frontend (Web Crypto API needs this format)
  publicKeyPem = pub
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\n/g, '');

  authLogger.info('RSA key pair initialized for payload encryption');
};

/**
 * Get the public key in base64 DER format (for Web Crypto API)
 */
export const getPublicKeyBase64 = (): string => {
  if (!publicKeyPem) {
    initializeKeyPair();
  }
  return publicKeyPem;
};

/**
 * Decrypt a value that was encrypted with our public key
 * The frontend sends: base64(RSA-OAEP encrypted ciphertext)
 */
export const decryptPayloadValue = (encryptedBase64: string): string => {
  if (!privateKey) {
    initializeKeyPair();
  }

  try {
    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: PADDING,
        oaepHash: OAEP_HASH,
      },
      encryptedBuffer,
    );
    return decrypted.toString('utf8');
  } catch {
    throw new Error('Failed to decrypt payload');
  }
};

/**
 * Decrypt a value to raw Buffer (for AES key decryption)
 */
export const decryptPayloadRaw = (encryptedBase64: string): Buffer => {
  if (!privateKey) {
    initializeKeyPair();
  }

  const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
  return crypto.privateDecrypt(
    {
      key: privateKey,
      padding: PADDING,
      oaepHash: OAEP_HASH,
    },
    encryptedBuffer,
  );
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
