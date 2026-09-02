import crypto from 'crypto';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes (AC3)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes (AC5)
const RATE_LIMIT_MAX_REQUESTS = 3; // per phone number per window (AC5)

let snsClient: SNSClient | null = null;

function getSnsClient(): SNSClient {
  if (!snsClient) {
    snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return snsClient;
}

function getHmacKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return Buffer.from(keyBase64, 'base64');
}

/**
 * Deterministic keyed hash of an E.164 phone number (AC4).
 * Uses HMAC-SHA256 (not bcrypt) so equal phone numbers always hash to the
 * same value, which the phone_hash index and rate limiting below rely on.
 */
export function hashPhoneNumber(phoneNumber: string): string {
  return crypto.createHmac('sha256', getHmacKey()).update(phoneNumber).digest('hex');
}

export interface MagicToken {
  rawToken: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Generate a one-time magic link token: a high-entropy raw token for the SMS
 * link, and its SHA-256 hash for storage (the raw token is never persisted).
 */
export function generateMagicToken(): MagicToken {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  return { rawToken, tokenHash, expiresAt };
}

// In-memory rate limit store, keyed by phone hash (MVP; same approach as
// lib/api/rateLimiter.ts). Not shared with that module because its window is
// fixed at 60s, whereas this endpoint needs a 10-minute window (AC5).
const requestLog = new Map<string, number[]>();

/**
 * Returns true if another SMS may be sent to this phone number right now,
 * and records the attempt. Rejects once RATE_LIMIT_MAX_REQUESTS have been
 * made within RATE_LIMIT_WINDOW_MS (AC5).
 */
export function checkAndRecordRateLimit(phoneHash: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const timestamps = (requestLog.get(phoneHash) || []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(phoneHash, timestamps);
    return false;
  }

  timestamps.push(now);
  requestLog.set(phoneHash, timestamps);
  return true;
}

/**
 * Dispatch the magic link SMS via AWS SNS (AC3). Never logs the phone number
 * itself (AC4) -- only success/failure.
 */
export async function sendMagicLinkSms(phoneNumber: string, rawToken: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gettogether.app';
  const link = `${baseUrl}/auth/magic?t=${rawToken}`;
  const message = `Your get-together invite: ${link} (expires in 15 min, one-time use)`;

  const client = getSnsClient();
  await client.send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
    })
  );
}
