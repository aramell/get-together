import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';
import { encrypt } from '@/lib/encryption/crypto';

process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');

jest.mock('@/lib/db/client', () => ({
  getClient: jest.fn(),
}));

const { getClient } = require('@/lib/db/client');
const { syncUserAvailability, syncAllConnectedUsers } = require('@/lib/services/calendarSyncService');

describe('calendarSyncService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const encryptedRefreshToken = encrypt('refresh-token-abc');

  beforeEach(() => {
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
    (global as any).fetch = jest.fn();
  });

  describe('syncUserAvailability', () => {
    it('returns NOT_FOUND when the user has no active connection', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await syncUserAvailability('user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('refreshes the token, fetches freebusy, and wholesale-replaces busy blocks (AC1, AC5)', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ refresh_token_encrypted: encryptedRefreshToken }] }) // connection lookup
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }) // INSERT #1
        .mockResolvedValueOnce({ rows: [] }) // INSERT #2
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token-xyz' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            calendars: {
              primary: {
                busy: [
                  { start: '2026-08-27T09:00:00Z', end: '2026-08-27T10:00:00Z' },
                  { start: '2026-08-27T14:00:00Z', end: '2026-08-27T15:00:00Z' },
                ],
              },
            },
          }),
        });

      const result = await syncUserAvailability('user-1');

      expect(result.success).toBe(true);
      expect(result.data.syncedCount).toBe(2);

      const calls = mockClient.query.mock.calls.map((call: any[]) => call[0]);
      expect(calls[1]).toBe('BEGIN');
      expect(calls[2]).toMatch(/DELETE FROM google_calendar_busy_blocks/);
      expect(calls[3]).toMatch(/INSERT INTO google_calendar_busy_blocks/);
      expect(calls[4]).toMatch(/INSERT INTO google_calendar_busy_blocks/);
      expect(calls[5]).toBe('COMMIT');
    });

    it('deletes existing rows before inserting even when there are zero new busy blocks (wholesale replace, AC5)', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ refresh_token_encrypted: encryptedRefreshToken }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token-xyz' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ calendars: { primary: { busy: [] } } }) });

      const result = await syncUserAvailability('user-1');

      expect(result.success).toBe(true);
      expect(result.data.syncedCount).toBe(0);
      const calls = mockClient.query.mock.calls.map((call: any[]) => call[0]);
      expect(calls).toContain('BEGIN');
      expect(calls.some((c: string) => c.match(/DELETE FROM google_calendar_busy_blocks/))).toBe(true);
      expect(calls).toContain('COMMIT');
    });

    it('only ever persists start_time/end_time/user_id for busy blocks (AC6, privacy)', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ refresh_token_encrypted: encryptedRefreshToken }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token-xyz' }) })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            calendars: {
              primary: {
                busy: [{ start: '2026-08-27T09:00:00Z', end: '2026-08-27T10:00:00Z' }],
              },
            },
          }),
        });

      await syncUserAvailability('user-1');

      const insertCall = mockClient.query.mock.calls.find((call: any[]) =>
        String(call[0]).includes('INSERT INTO google_calendar_busy_blocks')
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![0]).toMatch(
        /INSERT INTO google_calendar_busy_blocks \(user_id, start_time, end_time, synced_at\)/
      );
      expect(insertCall![1]).toEqual(['user-1', '2026-08-27T09:00:00Z', '2026-08-27T10:00:00Z']);
    });

    it('flags needs_reauth when the access token refresh fails (AC3)', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ refresh_token_encrypted: encryptedRefreshToken }] }) // connection lookup
        .mockResolvedValueOnce({ rows: [] }); // needs_reauth UPDATE

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 400 });

      const result = await syncUserAvailability('user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NEEDS_REAUTH');

      const [updateSql, updateParams] = mockClient.query.mock.calls[1];
      expect(updateSql).toMatch(/UPDATE calendar_connections SET needs_reauth = true/);
      expect(updateParams).toEqual(['user-1']);
    });

    it('rolls back the transaction if the busy-block replace fails partway through', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ refresh_token_encrypted: encryptedRefreshToken }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('db error on delete')) // DELETE fails
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token-xyz' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ calendars: { primary: { busy: [] } } }) });

      const result = await syncUserAvailability('user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SYNC_ERROR');
      const calls = mockClient.query.mock.calls.map((call: any[]) => call[0]);
      expect(calls).toContain('ROLLBACK');
    });

    it('releases the client in all cases', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await syncUserAvailability('user-1');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('syncAllConnectedUsers', () => {
    it('isolates per-user failures so one failing user does not stop the others (AC4)', async () => {
      // First client call: list of connected users
      const listClient = { query: jest.fn().mockResolvedValueOnce({ rows: [{ user_id: 'user-1' }, { user_id: 'user-2' }] }), release: jest.fn() };
      const userClient1 = { query: jest.fn().mockResolvedValueOnce({ rows: [] }), release: jest.fn() }; // user-1: NOT_FOUND (fails)
      const userClient2 = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ refresh_token_encrypted: encryptedRefreshToken }] })
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // DELETE
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };

      getClient
        .mockResolvedValueOnce(listClient)
        .mockResolvedValueOnce(userClient1)
        .mockResolvedValueOnce(userClient2);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'access-token-xyz' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ calendars: { primary: { busy: [] } } }) });

      const result = await syncAllConnectedUsers();

      expect(result.data.synced).toBe(1);
      expect(result.data.failed).toBe(1);
      expect(result.data.results).toEqual([
        { userId: 'user-1', success: false },
        { userId: 'user-2', success: true },
      ]);
    });

    it('returns zero synced/failed when there are no connected users', async () => {
      const listClient = { query: jest.fn().mockResolvedValueOnce({ rows: [] }), release: jest.fn() };
      getClient.mockResolvedValueOnce(listClient);

      const result = await syncAllConnectedUsers();

      expect(result.data).toEqual({ synced: 0, failed: 0, results: [] });
    });
  });
});
