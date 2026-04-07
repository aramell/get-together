/**
 * Email Hashing Utility
 * Implements bcrypt-based email hashing for privacy-sensitive storage
 * AC3: Sensitive Field Encryption
 * AC7: Public Event Link Security
 */

import bcrypt from 'bcrypt';

/**
 * Configuration for bcrypt hashing
 * Rounds: 10 is standard for production (balance between security and performance)
 * Higher rounds = slower but more secure against brute force
 */
const BCRYPT_ROUNDS = 10;

/**
 * Hash an email address using bcrypt
 * Used for storing emails in public_rsvps table and potentially in users table
 *
 * @param email - Email address to hash
 * @returns Promise<string> - Bcrypt hash of the email
 * @throws Error if hashing fails
 */
export async function hashEmail(email: string): Promise<string> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    return await bcrypt.hash(normalizedEmail, BCRYPT_ROUNDS);
  } catch (error: any) {
    console.error('Error hashing email:', error.message);
    throw new Error(`Failed to hash email: ${error.message}`);
  }
}

/**
 * Verify an email against a previously hashed email
 * Used for comparing plaintext email input against stored hash (e.g., finding existing public RSVPs)
 *
 * @param email - Plaintext email to verify
 * @param hashedEmail - Previously hashed email to compare against
 * @returns Promise<boolean> - True if email matches hash
 * @throws Error if verification fails
 */
export async function verifyEmailHash(email: string, hashedEmail: string): Promise<boolean> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    return await bcrypt.compare(normalizedEmail, hashedEmail);
  } catch (error: any) {
    console.error('Error verifying email hash:', error.message);
    throw new Error(`Failed to verify email: ${error.message}`);
  }
}

/**
 * Validate email format before hashing
 * AC3: Email addresses must be valid format
 * Uses simplified RFC 5322-compliant pattern
 *
 * @param email - Email to validate
 * @returns boolean - True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Simplified RFC 5322 pattern: local@domain.tld
  // Allows: alphanumeric, dots, hyphens, underscores, plus signs in local part
  // Requires: at least one dot in domain
  const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.toLowerCase().trim());
}

/**
 * Normalize email for consistent hashing
 * Converts to lowercase and trims whitespace
 *
 * @param email - Email to normalize
 * @returns string - Normalized email
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
