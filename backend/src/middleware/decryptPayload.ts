import { Request, Response, NextFunction } from 'express';
import { decryptRequestBody } from '../utils/payloadEncryption';

/**
 * Middleware that decrypts encrypted fields in request body.
 *
 * Fields sent as __enc_<fieldName> are decrypted using the server's RSA private key
 * and placed into the body as <fieldName>.
 *
 * Example: { __enc_password: "base64ciphertext..." } -> { password: "plaintext" }
 *
 * If no encrypted fields are present, the body passes through unchanged.
 */
export const decryptPayload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.body || typeof req.body !== 'object') {
    next();
    return;
  }

  // Check if any fields need decryption
  const hasEncryptedFields = Object.keys(req.body).some(key => key.startsWith('__enc_'));
  if (!hasEncryptedFields) {
    next();
    return;
  }

  try {
    req.body = decryptRequestBody(req.body);
    next();
  } catch {
    res.status(400).json({ message: 'Invalid request payload' });
  }
};
