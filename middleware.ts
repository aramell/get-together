import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/groups', '/events', '/profile'];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password'];

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

  return NextResponse.next();
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
