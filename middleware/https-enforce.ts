/**
 * HTTPS Enforcement Middleware
 * AC2: HTTPS/TLS for All Data in Transit
 * AC6: API Endpoint Security
 *
 * Ensures all API requests are made over HTTPS in production
 * Sends HSTS header to enforce HTTPS in future requests
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * List of API routes that require HTTPS in production
 * All /api/* routes are protected
 */
const PROTECTED_ROUTES = ['/api/'];

/**
 * Enforce HTTPS for all API requests
 * - In production: Reject HTTP requests, add HSTS header
 * - In development: Allow both HTTP and HTTPS (for testing)
 *
 * @param req - Next.js request object
 * @returns Modified response with HSTS header or redirect
 */
export function enforceHttps(req: NextRequest): NextResponse | null {
  // Skip enforcement in development
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  // Check if request is to a protected route
  const url = req.nextUrl;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => url.pathname.startsWith(route));

  if (!isProtectedRoute) {
    return null;
  }

  // Check if request is already HTTPS
  const protocol = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol;

  if (protocol === 'https:' || protocol === 'https') {
    // Already HTTPS, add HSTS header and continue
    const response = NextResponse.next();
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    return response;
  }

  // HTTP request to protected route - redirect to HTTPS
  const httpsUrl = new URL(req.nextUrl);
  httpsUrl.protocol = 'https:';

  return NextResponse.redirect(httpsUrl, {
    status: 308, // Permanent redirect, preserve method
    headers: {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    },
  });
}

/**
 * Middleware to add HSTS header to all responses
 * AC2: HSTS header enforced with max-age=31536000 (1 year)
 *
 * @param req - Next.js request object
 * @returns Response with HSTS header
 */
export function addHstsHeader(req: NextRequest): NextResponse {
  const response = NextResponse.next();

  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

/**
 * Security headers middleware
 * Adds multiple security headers to prevent common attacks
 *
 * @param req - Next.js request object
 * @returns Response with security headers
 */
export function addSecurityHeaders(req: NextRequest): NextResponse {
  const response = NextResponse.next();

  // HSTS: Force HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Enable XSS filter in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Content Security Policy (basic)
  // Can be extended based on application needs
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  );

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}
