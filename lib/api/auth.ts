/**
 * API authentication utilities
 * Extracts Cognito's sub (subject/user ID) from JWT tokens
 */

import { NextRequest } from 'next/server';
import { getSubFromJWT } from '@/lib/auth/jwt';

/**
 * Extract Cognito sub (user ID) from request
 * Returns the Cognito subject claim which uniquely identifies the user
 * No database lookups needed - sub is directly from the JWT token
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    // Get JWT token from cookies
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return null;
    }

    // Extract sub (Cognito user ID) from JWT
    const sub = getSubFromJWT(accessToken);
    return sub;
  } catch (error) {
    console.error('Error extracting user ID from request:', error);
    return null;
  }
}
