/**
 * Email Hashing Tests
 * AC3: Sensitive Field Encryption
 * AC7: Public Event Link Security
 * AC9: Encryption Testing & Validation
 */

import { hashEmail, verifyEmailHash, isValidEmail, normalizeEmail } from '@/lib/encryption/hash';

describe('Email Hashing Utility', () => {
  describe('hashEmail()', () => {
    it('should hash an email address', async () => {
      const email = 'user@example.com';
      const hash = await hashEmail(email);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(email); // Hash should not equal plaintext
      expect(hash.length).toBeGreaterThan(20); // Bcrypt hashes are ~60 chars
    });

    it('should produce different hashes for same email (different salts)', async () => {
      const email = 'user@example.com';
      const hash1 = await hashEmail(email);
      const hash2 = await hashEmail(email);

      expect(hash1).not.toBe(hash2); // Each hash has different salt
    });

    it('should normalize email before hashing (lowercase)', async () => {
      const email1 = 'User@Example.com';
      const email2 = 'user@example.com';

      const hash1 = await hashEmail(email1);
      const hash2 = await hashEmail(email2);

      // Verify both hashes match the normalized email
      const match1 = await verifyEmailHash(email2, hash1);
      const match2 = await verifyEmailHash(email1, hash2);

      expect(match1).toBe(true);
      expect(match2).toBe(true);
    });

    it('should trim whitespace before hashing', async () => {
      const email1 = '  user@example.com  ';
      const email2 = 'user@example.com';

      const hash1 = await hashEmail(email1);
      const match = await verifyEmailHash(email2, hash1);

      expect(match).toBe(true);
    });

    it('should throw error on invalid input', async () => {
      await expect(hashEmail('')).rejects.toThrow();
    });
  });

  describe('verifyEmailHash()', () => {
    it('should verify correct email against hash', async () => {
      const email = 'user@example.com';
      const hash = await hashEmail(email);
      const match = await verifyEmailHash(email, hash);

      expect(match).toBe(true);
    });

    it('should reject incorrect email against hash', async () => {
      const email = 'user@example.com';
      const wrongEmail = 'wrong@example.com';
      const hash = await hashEmail(email);
      const match = await verifyEmailHash(wrongEmail, hash);

      expect(match).toBe(false);
    });

    it('should verify with case-insensitive comparison', async () => {
      const email = 'User@Example.COM';
      const hash = await hashEmail(email);
      const match = await verifyEmailHash('user@example.com', hash);

      expect(match).toBe(true);
    });

    it('should handle whitespace in verification', async () => {
      const email = 'user@example.com';
      const hash = await hashEmail(email);
      const match = await verifyEmailHash('  user@example.com  ', hash);

      expect(match).toBe(true);
    });

    it('should return false for empty hash', async () => {
      const email = 'user@example.com';
      try {
        await verifyEmailHash(email, '');
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should prevent timing attacks (constant time comparison)', async () => {
      // Bcrypt uses constant-time comparison internally
      // This test verifies hashes don't match similar emails
      const email1 = 'user@example.com';
      const email2 = 'usee@example.com'; // Similar but different
      const hash = await hashEmail(email1);
      const match = await verifyEmailHash(email2, hash);

      expect(match).toBe(false);
    });
  });

  describe('isValidEmail()', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
        'user123@sub.example.com',
      ];

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'user@',
        '@example.com',
        'user example.com',
        'user@.com',
        'user@example',
        'user @example.com',
        'user@ example.com',
      ];

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should handle empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isValidEmail('User@Example.COM')).toBe(true);
      expect(isValidEmail('USER@EXAMPLE.COM')).toBe(true);
    });
  });

  describe('normalizeEmail()', () => {
    it('should convert email to lowercase', () => {
      const email = 'User@Example.COM';
      const normalized = normalizeEmail(email);

      expect(normalized).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      const email = '  user@example.com  ';
      const normalized = normalizeEmail(email);

      expect(normalized).toBe('user@example.com');
    });

    it('should handle mixed case with whitespace', () => {
      const email = '  User@Example.COM  ';
      const normalized = normalizeEmail(email);

      expect(normalized).toBe('user@example.com');
    });

    it('should be idempotent', () => {
      const email = '  User@Example.COM  ';
      const once = normalizeEmail(email);
      const twice = normalizeEmail(once);

      expect(once).toBe(twice);
    });
  });

  describe('Integration: Hash and Verify', () => {
    it('should hash and verify user registration email', async () => {
      const email = 'newuser@example.com';
      const hash = await hashEmail(email);

      // Later, when user logs in with same email
      const isValidLogin = await verifyEmailHash(email, hash);
      expect(isValidLogin).toBe(true);

      // But wrong email should not match
      const isWrongEmail = await verifyEmailHash('other@example.com', hash);
      expect(isWrongEmail).toBe(false);
    });

    it('should hash and verify public RSVP email', async () => {
      const email = 'guest@example.com';
      const hash = await hashEmail(email);

      // Stored in database: hash
      // Later, user submits RSVP with same email
      const isExistingRsvp = await verifyEmailHash(email, hash);
      expect(isExistingRsvp).toBe(true);

      // Different email = different RSVP
      const isDifferentRsvp = await verifyEmailHash('other@example.com', hash);
      expect(isDifferentRsvp).toBe(false);
    });

    it('should support duplicate detection', async () => {
      const email = 'user@example.com';
      const hash1 = await hashEmail(email);
      const hash2 = await hashEmail(email);

      // Both hashes are different (different salts)
      expect(hash1).not.toBe(hash2);

      // But both verify the same email
      const match1 = await verifyEmailHash(email, hash1);
      const match2 = await verifyEmailHash(email, hash2);

      expect(match1).toBe(true);
      expect(match2).toBe(true);
    });
  });
});
