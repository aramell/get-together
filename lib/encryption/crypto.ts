/**
 * Reversible Field Encryption Utility (AES-256-GCM)
 *
 * Unlike lib/encryption/hash.ts's one-way bcrypt hashing (used for values only ever
 * compared, never read back), this is for values that must be decrypted later — e.g.
 * OAuth refresh tokens (Story 3.5, calendar_connections.refresh_token_encrypted).
 * Extends the managed-encryption pattern (Architecture Decision 2d) for credentials
 * where Postgres at-rest encryption alone isn't sufficient (Decision 6b).
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV, recommended for GCM

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a base64-encoded 32-byte key (AES-256)');
  }

  return key;
}

/**
 * Encrypt a plaintext string.
 * Output format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

/**
 * Decrypt a string produced by encrypt().
 * @throws Error if the value is malformed or the auth tag doesn't verify (tampered/wrong key)
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString('utf8');
}
