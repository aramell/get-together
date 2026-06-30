import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders } from '@/middleware/https-enforce';
import { getLogger } from '@/lib/logging/logger';
import { createCorrelationContext, getCorrelationId } from '@/lib/logging/correlation-id';

const logger = getLogger('middleware');

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/groups', '/events', '/profile'];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password'];

// Routes that require HTTPS in production
const httpsProtectedRoutes = ['/api/'];

/**
 * Decode JWT and check if expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const decodedToken = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const expirationTime = decodedToken.exp ? decodedToken.exp * 1000 : null;

    if (!expirationTime) return true;
    return Date.now() > expirationTime;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Initialize correlation context for this request (AC1, AC5)
  // Extract correlation ID from header or generate new one
  const correlationIdHeader = request.headers.get('X-Correlation-ID');
  const startTime = Date.now();
  createCorrelationContext({
    correlationId: correlationIdHeader || undefined,
    requestPath: pathname
  });

  // Log incoming request (AC1: All API endpoints log request/response)
  const method = request.method;
  logger.info('Incoming request', {
    correlationId: getCorrelationId(),
    method,
    path: pathname,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  });

  // HTTPS enforcement for API routes in production (AC2)
  if (process.env.NODE_ENV === 'production') {
    const isApiRoute = httpsProtectedRoutes.some((route) => pathname.startsWith(route));
    if (isApiRoute) {
      const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol;
      if (protocol === 'http:' || protocol === 'http') {
        const httpsUrl = new URL(request.nextUrl);
        httpsUrl.protocol = 'https:';
        return NextResponse.redirect(httpsUrl, { status: 308 });
      }
    }
  }

  // Get tokens from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const idToken = request.cookies.get('idToken')?.value;

  // Check if tokens exist AND are not expired
  const isAuthenticated = !!(
    accessToken &&
    idToken &&
    !isTokenExpired(accessToken) &&
    !isTokenExpired(idToken)
  );

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Check if route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If trying to access protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // If accessing auth routes while authenticated, redirect to groups
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/groups', request.url));
  }

  // Add security headers (AC2, AC6)
  const response = NextResponse.next();

  // HSTS header (1 year)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Security headers to prevent common attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  );
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Add correlation ID to response headers (AC5: X-Correlation-ID header)
  response.headers.set('X-Correlation-ID', getCorrelationId());

  // Log response (AC1: log response with status code and duration)
  const duration = Date.now() - startTime;
  logger.info('Response sent', {
    correlationId: getCorrelationId(),
    method,
    path: pathname,
    status: response.status,
    duration
  });

  return response;
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/groups/:path*',
    '/events/:path*',
    '/profile/:path*',
    // Auth routes
    '/auth/:path*',
  ],
};
