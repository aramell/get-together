'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSubFromJWT } from '@/lib/auth/jwt';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  idToken: string | null;
  userId: string | null;
  logout: () => void;
  checkTokenExpiration: () => boolean;
  isTokenExpired: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('[AuthProvider] Rendering at', new Date().toISOString());
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  console.log('[AuthProvider] Current state:', { isAuthenticated, isLoading, userId: userId ? 'set' : 'null' });

  // Debug: log when useEffect is about to run
  console.log('[AuthProvider] About to set up useEffect for auth initialization');

  /**
   * Decode JWT token and extract expiration time
   */
  const getTokenExpiration = (token: string): number | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const decodedToken = JSON.parse(atob(parts[1]));
      return decodedToken.exp ? decodedToken.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  /**
   * Check if token is expired
   */
  const isTokenExpired = useCallback(() => {
    if (!accessToken) return true;

    const expirationTime = getTokenExpiration(accessToken);
    if (!expirationTime) return true;

    return Date.now() > expirationTime;
  }, [accessToken]);

  /**
   * Check token expiration and handle logout if needed
   */
  const checkTokenExpiration = useCallback((): boolean => {
    if (isTokenExpired()) {
      logout();
      return true;
    }
    return false;
  }, [isTokenExpired]);

  /**
   * Logout user and clear tokens
   */
  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('userId');

    // Clear cookies by setting empty values
    document.cookie = 'accessToken=; max-age=0; path=/';
    document.cookie = 'idToken=; max-age=0; path=/';
    document.cookie = 'refreshToken=; max-age=0; path=/';

    // Update state
    setIsAuthenticated(false);
    setAccessToken(null);
    setIdToken(null);
    setUserId(null);

    // Redirect to login
    router.push('/auth/login');
  }, [router]);

  /**
   * Initialize auth state from localStorage and cookies on mount
   * Empty dependency array ensures this runs exactly once when component mounts
   */
  React.useEffect(() => {
    const initializeAuth = async () => {
      console.log('[AuthContext] useEffect: Checking if on client...');

      // Ensure we're on the client side before accessing localStorage
      if (typeof window === 'undefined') {
        console.log('[AuthContext] Not on client side, skipping initialization');
        return;
      }

      console.log('[AuthContext] Mount: Initializing auth state from localStorage/cookies...');
      try {
        // Try localStorage first (works in all environments)
        let token = localStorage.getItem('accessToken');
        let idTok = localStorage.getItem('idToken');

        console.log('[AuthContext] Token from localStorage:', !!token);
        console.log('[AuthContext] IdToken from localStorage:', !!idTok);

        // If tokens are in localStorage, use them
        if (token && idTok) {
          // Check if token is not expired
          const expTime = getTokenExpiration(token);
          console.log('[AuthContext] Token expiration time:', expTime);

          if (expTime && Date.now() > expTime) {
            // Token expired, clear it
            console.log('[AuthContext] Token expired, clearing tokens');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('idToken');
            localStorage.removeItem('userId');
            setIsAuthenticated(false);
          } else {
            // Token valid, extract user ID (sub) from JWT
            const sub = getSubFromJWT(token);
            console.log('[AuthContext] Token valid, extracted sub:', sub);
            setAccessToken(token);
            setIdToken(idTok);
            setUserId(sub);
            setIsAuthenticated(true);
            console.log('[AuthContext] Auth state set to authenticated');
          }
        } else {
          console.log('[AuthContext] No tokens in localStorage. Checking if authenticated via API (cookies/deployed)...');
          // In deployed environments, tokens might be in HTTP-only cookies
          // Try to verify auth by making a test API request with timeout
          let testAuthResponse = null;
          try {
            console.log('[AuthContext] Calling /api/auth/me...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            testAuthResponse = await fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include', // Include cookies
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            console.log('[AuthContext] /api/auth/me responded with status:', testAuthResponse.status);
          } catch (fetchError) {
            console.log('[AuthContext] /api/auth/me failed:', fetchError);
          }

          if (testAuthResponse && testAuthResponse.ok) {
            console.log('[AuthContext] Auth verified via API - user has valid session cookies');
            const userData = await testAuthResponse.json();
            if (userData.userId) {
              setUserId(userData.userId);
              setIsAuthenticated(true);
              // Try to store in localStorage for next time
              if (userData.accessToken) {
                localStorage.setItem('accessToken', userData.accessToken);
              }
              if (userData.idToken) {
                localStorage.setItem('idToken', userData.idToken);
              }
            }
          } else {
            console.log('[AuthContext] Not authenticated - no tokens in localStorage and API auth failed');
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error during initialization:', error);
        setIsAuthenticated(false);
      } finally {
        // Done loading
        console.log('[AuthContext] Setting isLoading to false');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Set up interval to check token expiration every minute
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (checkTokenExpiration()) {
        // Token expired and user logged out
        clearInterval(interval);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, checkTokenExpiration]);

  /**
   * Check token expiration when window regains focus
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = () => {
      checkTokenExpiration();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, checkTokenExpiration]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    accessToken,
    idToken,
    userId,
    logout,
    checkTokenExpiration,
    isTokenExpired,
  };

  console.log('[AuthContext] Rendering provider with value:', {
    isAuthenticated,
    isLoading,
    userId: userId ? 'set' : 'null',
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
