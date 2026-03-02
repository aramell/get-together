import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/groups', '/events', '/profile'];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get tokens from cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const idToken = request.cookies.get('idToken')?.value;

  const isAuthenticated = !!(accessToken && idToken);

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // Check if route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // If trying to access protected route without authentication
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // If accessing auth routes while authenticated, redirect to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
