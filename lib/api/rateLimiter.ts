/**
 * Rate Limiter for Sensitive Endpoints
 * Story 8.2 Task 9: Security & Data Breach Notification
 * Prevents DOS attacks on data export/deletion endpoints
 */

// Simple in-memory rate limiter (for MVP)
// Production: use Redis-based rate limiter
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute window
const EXPORT_LIMIT = 10; // max 10 exports per minute
const DELETE_LIMIT = 1; // max 1 deletion per minute per user

export function getRateLimitKey(userId: string, endpoint: string): string {
  return `${userId}:${endpoint}`;
}

export function checkRateLimit(userId: string, endpoint: string, limit: number): boolean {
  const key = getRateLimitKey(userId, endpoint);
  const now = Date.now();

  let entry = requestCounts.get(key);

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    return false;
  }

  // Increment counter
  entry.count++;
  return true;
}

export function enforceRateLimit(endpoint: 'export' | 'delete') {
  return (userId: string) => {
    const limit = endpoint === 'export' ? EXPORT_LIMIT : DELETE_LIMIT;
    return checkRateLimit(userId, endpoint, limit);
  };
}
