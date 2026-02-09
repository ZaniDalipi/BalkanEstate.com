import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { decryptPayloadRaw } from '../utils/payloadEncryption';

/**
 * Response Encryption Middleware
 *
 * If the client sends an `X-Response-Key` header containing an RSA-encrypted
 * AES-256 key, this middleware overrides `res.json()` so the entire JSON
 * response body is AES-256-GCM encrypted before it leaves the server.
 *
 * The client decrypts with its AES key, so the Network tab only shows ciphertext.
 *
 * Protocol:
 *   Client → Header  X-Response-Key: base64(RSA-OAEP(aes_key_32_bytes))
 *   Server → Body    { __encrypted: true, iv, tag, data }
 */
export const encryptResponse = (req: Request, res: Response, next: NextFunction): void => {
  const encryptedAesKey = req.headers['x-response-key'] as string;

  if (!encryptedAesKey) {
    next();
    return;
  }

  let aesKey: Buffer;
  try {
    aesKey = decryptPayloadRaw(encryptedAesKey);
    if (aesKey.length !== 32) {
      // Not a valid AES-256 key, skip encryption
      next();
      return;
    }
  } catch {
    // Can't decrypt key — fall through without response encryption
    next();
    return;
  }

  // Override res.json to encrypt the response body
  const originalJson = res.json.bind(res);

  (res as any).json = function (body: any): Response {
    try {
      const plaintext = JSON.stringify(body);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      return originalJson({
        __encrypted: true,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: encrypted.toString('base64'),
      });
    } catch {
      // If encryption fails, send plaintext as fallback
      return originalJson(body);
    }
  };

  next();
};
