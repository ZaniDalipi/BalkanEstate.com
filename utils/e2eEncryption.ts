/**
 * End-to-End Encryption Utilities
 * Uses Web Crypto API for client-side encryption
 * Hybrid encryption: RSA-OAEP for key exchange + AES-GCM for message encryption
 */

// IndexedDB database name for storing keys
const DB_NAME = 'balkan-estate-e2e';
const STORE_NAME = 'keys';

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

interface StoredKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

/**
 * Open IndexedDB for key storage
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Store key pair in IndexedDB
 */
async function storeKeyPair(userId: string, keyPair: KeyPair): Promise<void> {
  const db = await openDB();
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ publicKeyJwk, privateKeyJwk }, userId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve key pair from IndexedDB
 */
async function retrieveKeyPair(userId: string): Promise<KeyPair | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(userId);

    request.onsuccess = async () => {
      const stored = request.result as StoredKeyPair | undefined;
      if (!stored) {
        resolve(null);
        return;
      }

      try {
        const publicKey = await crypto.subtle.importKey(
          'jwk',
          stored.publicKeyJwk,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          true,
          ['encrypt']
        );

        const privateKey = await crypto.subtle.importKey(
          'jwk',
          stored.privateKeyJwk,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          true,
          ['decrypt']
        );

        resolve({ publicKey, privateKey });
      } catch (error) {
        reject(error);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate RSA key pair for a user
 */
export async function generateKeyPair(userId: string): Promise<string> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    ) as KeyPair;

    // Store key pair locally
    await storeKeyPair(userId, keyPair);

    // Export public key to share with server
    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    return JSON.stringify(publicKeyJwk);
  } catch (error) {
    console.error('Error generating key pair:', error);
    throw new Error('Failed to generate encryption keys');
  }
}

/**
 * Get user's key pair (generate if doesn't exist)
 */
export async function getUserKeyPair(userId: string): Promise<KeyPair> {
  let keyPair = await retrieveKeyPair(userId);

  if (!keyPair) {
    // Generate new key pair if doesn't exist
    await generateKeyPair(userId);
    keyPair = await retrieveKeyPair(userId);
    if (!keyPair) {
      throw new Error('Failed to generate or retrieve key pair');
    }
  }

  return keyPair;
}

/**
 * Import public key from JWK string
 */
export async function importPublicKey(publicKeyJwkString: string): Promise<CryptoKey> {
  try {
    const publicKeyJwk = JSON.parse(publicKeyJwkString);
    return await crypto.subtle.importKey(
      'jwk',
      publicKeyJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );
  } catch (error) {
    console.error('Error importing public key:', error);
    throw new Error('Failed to import public key');
  }
}

/**
 * Encrypt a message for a recipient
 * Returns: { encryptedMessage, encryptedKey, iv } all as base64 strings
 */
export async function encryptMessage(
  message: string,
  recipientPublicKeyJwk: string
): Promise<{ encryptedMessage: string; encryptedKey: string; iv: string }> {
  try {
    // Generate random AES key for this message
    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt message with AES
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedMessage = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encodedMessage
    );

    // Export AES key
    const exportedAesKey = await crypto.subtle.exportKey('raw', aesKey);

    // Encrypt AES key with recipient's public RSA key
    const recipientPublicKey = await importPublicKey(recipientPublicKeyJwk);
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      recipientPublicKey,
      exportedAesKey
    );

    // Convert to base64 for transmission
    return {
      encryptedMessage: arrayBufferToBase64(encryptedMessage),
      encryptedKey: arrayBufferToBase64(encryptedKey),
      iv: arrayBufferToBase64(iv.buffer),
    };
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt a message using user's private key
 */
export async function decryptMessage(
  encryptedMessageB64: string,
  encryptedKeyB64: string,
  ivB64: string,
  userId: string
): Promise<string> {
  try {
    // Get user's private key
    const keyPair = await getUserKeyPair(userId);

    // Decrypt AES key using private RSA key
    const encryptedKey = base64ToArrayBuffer(encryptedKeyB64);
    const aesKeyBuffer = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      keyPair.privateKey,
      encryptedKey
    );

    // Import decrypted AES key
    const aesKey = await crypto.subtle.importKey(
      'raw',
      aesKeyBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt message
    const encryptedMessage = base64ToArrayBuffer(encryptedMessageB64);
    const iv = base64ToArrayBuffer(ivB64);
    const decryptedMessage = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedMessage
    );

    // Decode to string
    return new TextDecoder().decode(decryptedMessage);
  } catch (error) {
    console.error('Error decrypting message:', error);
    return '[Unable to decrypt message]';
  }
}

/**
 * Encrypt message for multiple recipients (group chat support)
 */
export async function encryptMessageForMultipleRecipients(
  message: string,
  recipientPublicKeys: { userId: string; publicKeyJwk: string }[]
): Promise<{ encryptedMessage: string; iv: string; encryptedKeys: { userId: string; encryptedKey: string }[] }> {
  try {
    // Generate random AES key for this message
    const aesKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt message with AES (once)
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedMessage = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encodedMessage
    );

    // Export AES key
    const exportedAesKey = await crypto.subtle.exportKey('raw', aesKey);

    // Encrypt AES key for each recipient
    const encryptedKeys = await Promise.all(
      recipientPublicKeys.map(async ({ userId, publicKeyJwk }) => {
        const recipientPublicKey = await importPublicKey(publicKeyJwk);
        const encryptedKey = await crypto.subtle.encrypt(
          { name: 'RSA-OAEP' },
          recipientPublicKey,
          exportedAesKey
        );

        return {
          userId,
          encryptedKey: arrayBufferToBase64(encryptedKey),
        };
      })
    );

    return {
      encryptedMessage: arrayBufferToBase64(encryptedMessage),
      iv: arrayBufferToBase64(iv.buffer),
      encryptedKeys,
    };
  } catch (error) {
    console.error('Error encrypting message for multiple recipients:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Export user's public key for sharing
 */
export async function exportPublicKey(userId: string): Promise<string> {
  const keyPair = await getUserKeyPair(userId);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  return JSON.stringify(publicKeyJwk);
}

/**
 * Helper: Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
