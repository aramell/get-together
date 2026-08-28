/**
 * API authentication utilities
 * Extracts Cognito's sub (subject/user ID) from JWT tokens
 */

import { NextRequest } from 'next/server';
import { getVerifiedSubFromJWT } from '@/lib/auth/jwt';

/**
 * Extract Cognito sub (user ID) from request
 * Returns the Cognito subject claim which uniquely identifies the user, only
 * after verifying the token's signature, expiration, issuer, and client ID.
 * No database lookups needed - sub is directly from the verified JWT.
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    // Get JWT token from cookies
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return null;
    }

    // Extract sub (Cognito user ID) from the verified JWT
    return await getVerifiedSubFromJWT(accessToken);
  } catch (error) {
    console.error('Error extracting user ID from request:', error);
    return null;
  }
}

/**
 * Extract Cognito sub (user ID) from a request's `Authorization: Bearer <token>`
 * header, only after verifying the token's signature, expiration, issuer, and
 * client ID. Use this for routes that authenticate via a Bearer header instead
 * of the `accessToken` cookie (see `getUserIdFromRequest`).
 */
export async function getUserIdFromBearerToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return getVerifiedSubFromJWT(token);
}
