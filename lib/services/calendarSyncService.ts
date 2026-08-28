import { getClient } from '@/lib/db/client';
import { decrypt } from '@/lib/encryption/crypto';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_FREEBUSY_ENDPOINT = 'https://www.googleapis.com/calendar/v3/freeBusy';
const SYNC_WINDOW_DAYS = 30; // forward window per Architecture Decision 6a

interface ServiceResult<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errorCode?: string;
}

interface GoogleFreeBusyBlock {
  start: string;
  end: string;
}

function getGoogleOAuthConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
  }

  return { clientId, clientSecret };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Google access token refresh failed (${response.status})`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchFreeBusy(accessToken: string, timeMin: string, timeMax: string): Promise<GoogleFreeBusyBlock[]> {
  const response = await fetch(GOOGLE_FREEBUSY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: 'primary' }] }),
  });

  if (!response.ok) {
    throw new Error(`Google freebusy.query failed (${response.status})`);
  }

  const data = await response.json();
  return data.calendars?.primary?.busy || [];
}

/**
 * Sync one user's Google Calendar free/busy data into google_calendar_busy_blocks (AC1).
 * Refreshes the access token from the stored refresh token; on refresh failure, flags the
 * connection needs_reauth (AC3). On success, wholesale-replaces that user's synced window
 * rather than diffing (AC5). Only start/end times are ever persisted (AC6).
 */
export async function syncUserAvailability(userId: string): Promise<ServiceResult<{ syncedCount: number }>> {
  const client = await getClient();

  try {
    const connectionResult = await client.query(
      `SELECT refresh_token_encrypted FROM calendar_connections WHERE user_id = $1 AND needs_reauth = false`,
      [userId]
    );

    if (connectionResult.rows.length === 0) {
      return {
        success: false,
        message: 'No active Google Calendar connection for this user',
        error: 'NO_CONNECTION',
        errorCode: 'NOT_FOUND',
      };
    }

    const refreshToken = decrypt(connectionResult.rows[0].refresh_token_encrypted);

    const now = new Date();
    const windowEnd = new Date(now.getTime() + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const timeMin = now.toISOString();
    const timeMax = windowEnd.toISOString();

    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(refreshToken);
    } catch (refreshError) {
      // Refresh token revoked/expired -- flag for re-auth (AC3, surfaced in Story 3.8's prompt)
      await client.query(
        `UPDATE calendar_connections SET needs_reauth = true, updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );
      return {
        success: false,
        message: 'Google Calendar authorization expired; reconnection required',
        error: 'NEEDS_REAUTH',
        errorCode: 'NEEDS_REAUTH',
      };
    }

    const busyBlocks = await fetchFreeBusy(accessToken, timeMin, timeMax);

    // Wholesale replace (AC5): delete this user's synced window, then reinsert, in one transaction
    await client.query('BEGIN');
    try {
      await client.query(
        `DELETE FROM google_calendar_busy_blocks WHERE user_id = $1 AND start_time >= $2 AND start_time < $3`,
        [userId, timeMin, timeMax]
      );

      for (const block of busyBlocks) {
        await client.query(
          `INSERT INTO google_calendar_busy_blocks (user_id, start_time, end_time, synced_at) VALUES ($1, $2, $3, NOW())`,
          [userId, block.start, block.end]
        );
      }

      await client.query('COMMIT');
    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    }

    return {
      success: true,
      message: 'Google Calendar availability synced',
      data: { syncedCount: busyBlocks.length },
    };
  } catch (error: any) {
    console.error(`Error syncing Google Calendar availability for user ${userId}:`, error);
    return {
      success: false,
      message: 'Failed to sync Google Calendar availability',
      error: error.message,
      errorCode: 'SYNC_ERROR',
    };
  } finally {
    client.release();
  }
}

/**
 * Run a sync pass over every connection that doesn't currently need re-auth. Each user's
 * sync is isolated with try/catch so one user's failure never stops the others (AC4).
 */
export async function syncAllConnectedUsers(): Promise<
  ServiceResult<{ synced: number; failed: number; results: Array<{ userId: string; success: boolean }> }>
> {
  const client = await getClient();
  let userIds: string[];

  try {
    const result = await client.query(`SELECT user_id FROM calendar_connections WHERE needs_reauth = false`);
    userIds = result.rows.map((row: any) => row.user_id);
  } finally {
    client.release();
  }

  const results: Array<{ userId: string; success: boolean }> = [];
  let synced = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      const result = await syncUserAvailability(userId);
      results.push({ userId, success: result.success });
      if (result.success) {
        synced++;
      } else {
        failed++;
      }
    } catch (error) {
      // Guards against a truly unexpected throw escaping syncUserAvailability's own handling (AC4)
      console.error(`Unexpected error syncing Google Calendar for user ${userId}:`, error);
      results.push({ userId, success: false });
      failed++;
    }
  }

  return {
    success: true,
    message: `Synced ${synced} user(s), ${failed} failed`,
    data: { synced, failed, results },
  };
}
