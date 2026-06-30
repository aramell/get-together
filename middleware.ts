import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/groups', '/events', '/profile'];
const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password'];

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true;
    return Date.now() > payload.exp * 1000;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const accessToken = request.cookies.get('accessToken')?.value;
  const idToken = request.cookies.get('idToken')?.value;

  const isAuthenticated = !!(
    accessToken &&
    idToken &&
    !isTokenExpired(accessToken) &&
    !isTokenExpired(idToken)
  );

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/groups', request.url));
  }

  const response = NextResponse.next();

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
  );
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const correlationId = request.headers.get('X-Correlation-ID') || crypto.randomUUID();
  response.headers.set('X-Correlation-ID', correlationId);

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
