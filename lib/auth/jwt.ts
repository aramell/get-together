/**
 * JWT utility functions for extracting user information from tokens
 * Uses Cognito's standard claims
 */

export interface DecodedToken {
  'cognito:username': string; // email
  email: string;
  sub: string; // Cognito user ID (unique identifier)
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Decode a JWT token (without verification - only for reading claims)
 * NOTE: In production, verify the token signature with Cognito's public key
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    if (!token || token.split('.').length !== 3) {
      return null;
    }

    const parts = token.split('.');
    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    return decoded as DecodedToken;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract Cognito sub (user ID) from JWT token
 * This is the primary user identifier from Cognito
 */
export function getSubFromJWT(token: string): string | null {
  const decoded = decodeJWT(token);
  return decoded?.sub || null;
}

/**
 * Extract email from JWT token
 */
export function getEmailFromJWT(token: string): string | null {
  const decoded = decodeJWT(token);
  return decoded?.email || decoded?.['cognito:username'] || null;
}
