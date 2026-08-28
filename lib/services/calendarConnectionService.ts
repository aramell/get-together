import crypto from 'crypto';
import { getClient } from '@/lib/db/client';
import { encrypt, decrypt } from '@/lib/encryption/crypto';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

// calendar.readonly covers freebusy.query (Story 3.6); userinfo.email identifies the connected account (AC3)
const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  connectedEmail?: string;
  needsReauth?: boolean;
}

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI)');
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Build the Google OAuth consent URL and a fresh CSRF state token.
 * The caller (API route) is responsible for persisting `state` (e.g. an httpOnly cookie)
 * and validating it against the callback's `state` query param (AC1).
 */
export function initiateConnect(): { url: string; state: string } {
  const config = getGoogleOAuthConfig();
  const state = crypto.randomBytes(32).toString('hex');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return { url: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`, state };
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const config = getGoogleOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

async function fetchGoogleAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google account info (${response.status})`);
  }

  const data = await response.json();
  if (!data.email) {
    throw new Error('Google account info response did not include an email');
  }

  return data.email;
}

/**
 * Handle the OAuth callback: exchange the authorization code for tokens, look up the
 * connected account's email, encrypt the refresh token, and upsert the user's
 * calendar_connections row (AC2, AC5 -- re-connect updates rather than duplicates).
 *
 * Note: on re-connect, Google only returns a new refresh_token if the user re-consents
 * (guaranteed here by prompt=consent). If Google omits it, the existing encrypted
 * refresh token is kept rather than overwritten with nothing.
 */
export async function handleCallback(
  code: string,
  userId: string
): Promise<ServiceResult<{ connectedEmail: string }>> {
  const client = await getClient();

  try {
    const tokens = await exchangeCodeForTokens(code);
    const connectedEmail = await fetchGoogleAccountEmail(tokens.access_token);

    if (tokens.refresh_token) {
      const encryptedRefreshToken = encrypt(tokens.refresh_token);

      await client.query(
        `INSERT INTO calendar_connections (user_id, provider, refresh_token_encrypted, connected_email, needs_reauth)
         VALUES ($1, 'google', $2, $3, false)
         ON CONFLICT (user_id) DO UPDATE
           SET refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
               connected_email = EXCLUDED.connected_email,
               needs_reauth = false,
               updated_at = NOW()`,
        [userId, encryptedRefreshToken, connectedEmail]
      );
    } else {
      // No new refresh token returned; update the connected email but keep the existing token.
      const updateResult = await client.query(
        `UPDATE calendar_connections
           SET connected_email = $2, needs_reauth = false, updated_at = NOW()
           WHERE user_id = $1
           RETURNING id`,
        [userId, connectedEmail]
      );

      if (updateResult.rows.length === 0) {
        return {
          success: false,
          message: 'Google did not return a refresh token for this connection',
          error: 'MISSING_REFRESH_TOKEN',
          errorCode: 'OAUTH_ERROR',
        };
      }
    }

    return {
      success: true,
      message: 'Google Calendar connected',
      data: { connectedEmail },
    };
  } catch (error: any) {
    console.error('Error handling Google Calendar OAuth callback:', error);
    return {
      success: false,
      message: 'Failed to connect Google Calendar',
      error: error.message,
      errorCode: 'OAUTH_ERROR',
    };
  } finally {
    client.release();
  }
}

export async function getConnectionStatus(userId: string): Promise<ServiceResult<ConnectionStatus>> {
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT connected_email, needs_reauth FROM calendar_connections WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { success: true, data: { connected: false } };
    }

    const row = result.rows[0];
    return {
      success: true,
      data: {
        connected: true,
        connectedEmail: row.connected_email,
        needsReauth: row.needs_reauth,
      },
    };
  } catch (error: any) {
    console.error('Error fetching calendar connection status:', error);
    return {
      success: false,
      message: 'Failed to fetch calendar connection status',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Disconnect a user's Google Calendar connection (Story 3.8, AC1): deletes the stored
 * refresh token and all cached busy blocks in one transaction, so a disconnect always
 * leaves both tables consistent (no orphaned busy blocks with no owning connection).
 */
export async function disconnect(userId: string): Promise<ServiceResult<void>> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    try {
      await client.query(`DELETE FROM calendar_connections WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM google_calendar_busy_blocks WHERE user_id = $1`, [userId]);
      await client.query('COMMIT');
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    }

    return { success: true, message: 'Google Calendar disconnected' };
  } catch (error: any) {
    console.error(`Error disconnecting Google Calendar for user ${userId}:`, error);
    return {
      success: false,
      message: 'Failed to disconnect Google Calendar',
      error: error.message,
      errorCode: 'INTERNAL_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Decrypt the stored refresh token for a user's Google Calendar connection.
 * Used by the sync worker (Story 3.6) -- never exposed via any API response.
 */
export async function getDecryptedRefreshToken(userId: string): Promise<string | null> {
  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT refresh_token_encrypted FROM calendar_connections WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return decrypt(result.rows[0].refresh_token_encrypted);
  } finally {
    client.release();
  }
}
