import crypto from 'crypto';

/**
 * Field-Level Encryption Service
 *
 * Provides AES-256-GCM encryption for sensitive user data fields.
 * All encrypted values are stored as base64 strings with embedded IV and auth tag.
 *
 * Format: iv:authTag:encryptedData (all base64 encoded)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Get field encryption key - MUST be set in environment
const getFieldEncryptionKey = (): Buffer => {
  const key = process.env.FIELD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('CRITICAL: FIELD_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable is not set.');
  }
  if (key.length < 32) {
    throw new Error('CRITICAL: Encryption key must be at least 32 characters.');
  }
  // Derive a consistent 32-byte key using SHA-256
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt a string value
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (base64)
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;

  try {
    const key = getFieldEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch {
    throw new Error('Failed to encrypt field');
  }
}

/**
 * Decrypt an encrypted string value
 * @param encryptedValue - The encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decryptField(encryptedValue: string): string {
  if (!encryptedValue) return encryptedValue;

  // Check if value is encrypted (has our format)
  if (!isEncrypted(encryptedValue)) {
    return encryptedValue; // Return as-is if not encrypted
  }

  try {
    const key = getFieldEncryptionKey();
    const parts = encryptedValue.split(':');

    if (parts.length !== 3) {
      return encryptedValue; // Not our format, return as-is
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    // If decryption fails, return as-is (might be unencrypted legacy data)
    return encryptedValue;
  }
}

/**
 * Check if a value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  // Check if parts look like base64
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return parts.every((part) => base64Regex.test(part) && part.length > 0);
}

/**
 * Hash a value for searching (deterministic, one-way)
 * Use this when you need to search for encrypted fields
 */
export function hashForSearch(value: string): string {
  if (!value) return value;

  const salt = process.env.SEARCH_HASH_SALT || process.env.ENCRYPTION_KEY || 'default-salt';
  return crypto
    .createHmac('sha256', salt)
    .update(value.toLowerCase().trim())
    .digest('hex');
}

/**
 * Encrypt an object's specified fields
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const encrypted = { ...obj };

  for (const field of fieldsToEncrypt) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encryptField(encrypted[field]) as T[keyof T];
    }
  }

  return encrypted;
}

/**
 * Decrypt an object's specified fields
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const decrypted = { ...obj };

  for (const field of fieldsToDecrypt) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decryptField(decrypted[field]) as T[keyof T];
    }
  }

  return decrypted;
}

/**
 * Mongoose plugin to auto-encrypt/decrypt fields
 * Usage: schema.plugin(encryptionPlugin, { fields: ['phone', 'address'] })
 */
export function encryptionPlugin(schema: any, options: { fields: string[] }) {
  const { fields } = options;

  // Encrypt before save
  schema.pre('save', function (this: any, next: () => void) {
    for (const field of fields) {
      if (this.isModified(field) && this[field] && !isEncrypted(this[field])) {
        this[field] = encryptField(this[field]);
      }
    }
    next();
  });

  // Decrypt after find
  schema.post('find', function (docs: any[]) {
    if (!docs) return;
    for (const doc of docs) {
      for (const field of fields) {
        if (doc[field]) {
          doc[field] = decryptField(doc[field]);
        }
      }
    }
  });

  schema.post('findOne', function (doc: any) {
    if (!doc) return;
    for (const field of fields) {
      if (doc[field]) {
        doc[field] = decryptField(doc[field]);
      }
    }
  });

  // Add method to get encrypted value for queries
  schema.methods.getEncryptedField = function (field: string): string {
    return this[field];
  };
}

/**
 * Mask sensitive data for logging/display
 */
export function maskSensitiveData(value: string, showChars: number = 4): string {
  if (!value || value.length <= showChars) return '****';

  const masked = '*'.repeat(value.length - showChars);
  return masked + value.slice(-showChars);
}

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****@****.***';

  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '**';

  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0][0] + '***.' + domainParts.slice(1).join('.');

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Mask phone number for display
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return '****';

  // Keep last 4 digits visible
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}

export default {
  encryptField,
  decryptField,
  isEncrypted,
  hashForSearch,
  encryptFields,
  decryptFields,
  encryptionPlugin,
  maskSensitiveData,
  maskEmail,
  maskPhone,
};
