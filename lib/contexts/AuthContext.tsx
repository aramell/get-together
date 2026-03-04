'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
   * Initialize auth state from localStorage and cookies
   */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const idTok = localStorage.getItem('idToken');
    const user = localStorage.getItem('userId');

    if (token && idTok) {
      // Check if token is not expired
      const expTime = getTokenExpiration(token);
      if (expTime && Date.now() > expTime) {
        // Token expired, logout
        logout();
      } else {
        // Token valid, set state
        setAccessToken(token);
        setIdToken(idTok);
        setUserId(user);
        setIsAuthenticated(true);
      }
    }

    // Done loading
    setIsLoading(false);
  }, [logout]);

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
