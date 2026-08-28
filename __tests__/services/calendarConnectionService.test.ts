import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';

process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/calendar/google/callback';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

jest.mock('@/lib/db/client', () => ({
  getClient: jest.fn(),
}));

const { getClient } = require('@/lib/db/client');
const {
  initiateConnect,
  handleCallback,
  getConnectionStatus,
  disconnect,
} = require('@/lib/services/calendarConnectionService');

describe('calendarConnectionService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
    (global as any).fetch = jest.fn();
  });

  describe('initiateConnect', () => {
    it('builds a Google consent URL with access_type=offline, prompt=consent, and a state param (AC1)', () => {
      const { url, state } = initiateConnect();
      const parsed = new URL(url);

      expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(parsed.searchParams.get('access_type')).toBe('offline');
      expect(parsed.searchParams.get('prompt')).toBe('consent');
      expect(parsed.searchParams.get('client_id')).toBe('test-client-id');
      expect(parsed.searchParams.get('redirect_uri')).toBe(process.env.GOOGLE_REDIRECT_URI);
      expect(parsed.searchParams.get('state')).toBe(state);
      expect(state).toHaveLength(64); // 32 random bytes, hex-encoded
    });

    it('generates a different state each call', () => {
      const first = initiateConnect();
      const second = initiateConnect();
      expect(first.state).not.toBe(second.state);
    });
  });

  describe('handleCallback', () => {
    function mockGoogleSuccess(refreshToken: string | null = 'refresh-token-abc') {
      const tokenResponse: Record<string, unknown> = {
        access_token: 'access-token-xyz',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        token_type: 'Bearer',
      };
      if (refreshToken !== null) {
        tokenResponse.refresh_token = refreshToken;
      }

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => tokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com' }),
        });
    }

    it('exchanges the code, encrypts the refresh token, and upserts the connection (AC2)', async () => {
      mockGoogleSuccess();
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await handleCallback('auth-code-123', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data.connectedEmail).toBe('user@example.com');

      const [sql, params] = mockClient.query.mock.calls[0];
      expect(sql).toMatch(/INSERT INTO calendar_connections/);
      expect(sql).toMatch(/ON CONFLICT \(user_id\) DO UPDATE/);
      expect(params[0]).toBe('user-1');
      expect(params[1]).not.toBe('refresh-token-abc'); // must be encrypted, not stored raw
      expect(params[2]).toBe('user@example.com');
    });

    it('never persists the access token, only the encrypted refresh token', async () => {
      mockGoogleSuccess();
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await handleCallback('auth-code-123', 'user-1');

      const [, params] = mockClient.query.mock.calls[0];
      const insertedValue = JSON.stringify(params);
      expect(insertedValue).not.toContain('access-token-xyz');
    });

    it('updates the existing row rather than failing when Google omits a refresh token on re-connect (AC5)', async () => {
      mockGoogleSuccess(null);
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'existing-connection-id' }] });

      const result = await handleCallback('auth-code-123', 'user-1');

      expect(result.success).toBe(true);
      const [sql, params] = mockClient.query.mock.calls[0];
      expect(sql).toMatch(/UPDATE calendar_connections/);
      expect(params).toEqual(['user-1', 'user@example.com']);
    });

    it('returns an error when Google omits a refresh token and there is no existing connection', async () => {
      mockGoogleSuccess(null);
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await handleCallback('auth-code-123', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('OAUTH_ERROR');
    });

    it('returns an error result when the token exchange fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      });

      const result = await handleCallback('bad-code', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('OAUTH_ERROR');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('releases the client even when the exchange throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network error'));

      await handleCallback('code', 'user-1');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getConnectionStatus', () => {
    it('returns connected: false when no row exists', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await getConnectionStatus('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ connected: false });
    });

    it('returns connected: true with email and needsReauth when a row exists (AC3)', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ connected_email: 'user@example.com', needs_reauth: false }],
      });

      const result = await getConnectionStatus('user-1');

      expect(result.data).toEqual({
        connected: true,
        connectedEmail: 'user@example.com',
        needsReauth: false,
      });
    });

    it('releases the client on error', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('db down'));

      const result = await getConnectionStatus('user-1');

      expect(result.success).toBe(false);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('deletes the connection and cached busy blocks in one transaction (AC1)', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // DELETE calendar_connections
        .mockResolvedValueOnce(undefined) // DELETE google_calendar_busy_blocks
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await disconnect('user-1');

      expect(result.success).toBe(true);
      const calls = mockClient.query.mock.calls.map((call: any[]) => call[0]);
      expect(calls[0]).toBe('BEGIN');
      expect(calls[1]).toMatch(/DELETE FROM calendar_connections WHERE user_id = \$1/);
      expect(calls[2]).toMatch(/DELETE FROM google_calendar_busy_blocks WHERE user_id = \$1/);
      expect(calls[3]).toBe('COMMIT');
      expect(mockClient.query.mock.calls[1][1]).toEqual(['user-1']);
      expect(mockClient.query.mock.calls[2][1]).toEqual(['user-1']);
    });

    it('rolls back and returns an error result if the transaction fails', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db error')); // DELETE calendar_connections fails

      const result = await disconnect('user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
      const calls = mockClient.query.mock.calls.map((call: any[]) => call[0]);
      expect(calls).toContain('ROLLBACK');
    });

    it('releases the client even when the transaction fails', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('db error'));

      await disconnect('user-1');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
