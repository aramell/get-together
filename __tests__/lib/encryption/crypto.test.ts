import { describe, it, expect, beforeAll } from '@jest/globals';
import crypto from 'crypto';

describe('lib/encryption/crypto', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('round-trips a plaintext string through encrypt/decrypt', () => {
    const { encrypt, decrypt } = require('@/lib/encryption/crypto');
    const plaintext = '1//0gExampleGoogleRefreshToken';

    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const { encrypt } = require('@/lib/encryption/crypto');
    const plaintext = 'same-plaintext-value';

    const first = encrypt(plaintext);
    const second = encrypt(plaintext);

    expect(first).not.toBe(second);
  });

  it('throws when decrypting a tampered ciphertext (auth tag mismatch)', () => {
    const { encrypt, decrypt } = require('@/lib/encryption/crypto');
    const encrypted = encrypt('sensitive-value');
    const [iv, authTag, ciphertext] = encrypted.split(':');
    const tampered = [iv, authTag, Buffer.from('tampered').toString('base64')].join(':');

    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws a clear error when ENCRYPTION_KEY is missing', () => {
    jest.resetModules();
    delete process.env.ENCRYPTION_KEY;
    const { encrypt } = require('@/lib/encryption/crypto');

    expect(() => encrypt('value')).toThrow('ENCRYPTION_KEY environment variable is not set');

    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  });

  it('throws when ENCRYPTION_KEY does not decode to 32 bytes', () => {
    jest.resetModules();
    process.env.ENCRYPTION_KEY = Buffer.from('too-short').toString('base64');
    const { encrypt } = require('@/lib/encryption/crypto');

    expect(() => encrypt('value')).toThrow('ENCRYPTION_KEY must be a base64-encoded 32-byte key');

    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  });
});
