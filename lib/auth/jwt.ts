/**
 * JWT utility functions for extracting user information from tokens
 * Uses Cognito's standard claims
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';

export interface DecodedToken {
  'cognito:username': string; // email
  email: string;
  sub: string; // Cognito user ID (unique identifier)
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Decode a JWT token WITHOUT verifying its signature.
 *
 * SECURITY: Never use this to authorize a request based on a token an untrusted
 * party presented to the server (e.g. an Authorization header or cookie on an
 * incoming API request) — an attacker can craft an arbitrary payload. This is
 * only safe when the token was just obtained directly from Cognito by the same
 * code that's decoding it (e.g. reading the `sub` out of a client's own
 * just-issued token to populate local UI state), since in that case the token
 * wasn't attacker-supplied input to a decision the app is making about someone
 * else. For anything that gates access to data or actions, use
 * `getVerifiedSubFromJWT` instead.
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    if (!token || token.split('.').length !== 3) {
      return null;
    }

    const parts = token.split('.');
    // Use atob for browser compatibility (works in both client and server environments)
    const decoded = JSON.parse(atob(parts[1]));
    return decoded as DecodedToken;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract Cognito sub (user ID) from JWT token WITHOUT verifying its signature.
 * See the security note on `decodeJWT` — do not use this to authorize requests.
 */
export function getSubFromJWT(token: string): string | null {
  const decoded = decodeJWT(token);
  return decoded?.sub || null;
}

/**
 * Extract email from JWT token WITHOUT verifying its signature.
 * See the security note on `decodeJWT` — do not use this to authorize requests.
 */
export function getEmailFromJWT(token: string): string | null {
  const decoded = decodeJWT(token);
  return decoded?.email || decoded?.['cognito:username'] || null;
}

type CognitoVerifier = ReturnType<
  typeof CognitoJwtVerifier.create<{ userPoolId: string; tokenUse: 'access'; clientId: string }>
>;

let cachedVerifier: CognitoVerifier | null = null;

/**
 * Get (and lazily create) the singleton Cognito JWT verifier.
 *
 * Exported so tests can seed the verifier's JWKS cache via `cacheJwks()` and
 * verify locally-signed test tokens without a network call to Cognito.
 */
export function getCognitoJwtVerifier(): CognitoVerifier {
  if (!cachedVerifier) {
    const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID;
    const clientId = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error(
        'Missing Cognito configuration: NEXT_PUBLIC_USER_POOL_ID and NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID are required to verify JWTs'
      );
    }

    cachedVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });
  }

  return cachedVerifier;
}

/**
 * Extract the Cognito sub (user ID) from a JWT, only after cryptographically
 * verifying its signature against Cognito's public JWKS, and validating that
 * the token is unexpired (`exp`) and was issued for this app's user pool and
 * client (`iss` / `client_id`).
 *
 * Use this — never `getSubFromJWT` — for any request whose JWT came from an
 * untrusted caller (an Authorization header or cookie on an incoming request).
 *
 * @returns the verified `sub` claim, or `null` if the token is missing,
 *   malformed, unsigned, forged, expired, or issued for a different
 *   user pool/client.
 */
export async function getVerifiedSubFromJWT(token: string): Promise<string | null> {
  if (!token) {
    return null;
  }

  try {
    const payload = await getCognitoJwtVerifier().verify(token);
    return payload.sub;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}
