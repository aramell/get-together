import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import crypto from 'crypto';

process.env.NEXT_PUBLIC_USER_POOL_ID = 'test-pool-id';
process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID = 'test-client-id';

interface MockCognitoCommand {
  __cmd: 'AdminCreateUser' | 'AdminSetUserPassword' | 'AdminInitiateAuth';
  input: Record<string, unknown>;
}

const mockSend = jest.fn();

// Explicit factory (not bare jest.mock(path)): avoids loading the real
// @aws-sdk/client-cognito-identity-provider package, whose ESM browser build
// fails ts-jest's CJS transform under this project's jsdom test environment
// (same issue as @aws-sdk/client-sns in Story 9.1's smsService.test.ts).
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  AdminCreateUserCommand: jest.fn().mockImplementation((input) => ({ input, __cmd: 'AdminCreateUser' })),
  AdminSetUserPasswordCommand: jest.fn().mockImplementation((input) => ({ input, __cmd: 'AdminSetUserPassword' })),
  AdminInitiateAuthCommand: jest.fn().mockImplementation((input) => ({ input, __cmd: 'AdminInitiateAuth' })),
}));

jest.mock('@/lib/db/client', () => ({
  getClient: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  addUserToGroup: jest.fn(),
}));

jest.mock('@/lib/services/userService', () => ({
  findUserByPhoneHash: jest.fn(),
  createUserProfileByPhoneHash: jest.fn(),
}));

import { getClient, query, queryOne } from '@/lib/db/client';
import { addUserToGroup } from '@/lib/db/queries';
import { findUserByPhoneHash, createUserProfileByPhoneHash } from '@/lib/services/userService';
import {
  consumeToken,
  findOrCreateUserByPhoneHash,
  addUserToTarget,
  signInViaMagicLink,
} from '@/lib/services/magicLinkService';

const mockGetClient = getClient as jest.MockedFunction<typeof getClient>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;
const mockAddUserToGroup = addUserToGroup as jest.MockedFunction<typeof addUserToGroup>;
const mockFindUserByPhoneHash = findUserByPhoneHash as jest.MockedFunction<typeof findUserByPhoneHash>;
const mockCreateUserProfileByPhoneHash = createUserProfileByPhoneHash as jest.MockedFunction<
  typeof createUserProfileByPhoneHash
>;

describe('magicLinkService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClient.mockResolvedValue(mockClient);
  });

  describe('consumeToken (AC1, AC6)', () => {
    const rawToken = 'raw-token-value';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('hashes the raw token, locks the row, and marks it used inside one transaction', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.startsWith('BEGIN')) return Promise.resolve();
        if (sql.includes('FOR UPDATE')) {
          return Promise.resolve({
            rows: [{ id: 'token-1', phone_hash: 'hashed-phone', target_type: null, target_id: null }],
          });
        }
        if (sql.startsWith('UPDATE')) return Promise.resolve();
        if (sql.startsWith('COMMIT')) return Promise.resolve();
        return Promise.resolve({ rows: [] });
      });

      const result = await consumeToken(rawToken);

      expect(result).toEqual({ id: 'token-1', phone_hash: 'hashed-phone', target_type: null, target_id: null });

      const selectCall = mockClient.query.mock.calls.find((c) => (c[0] as string).includes('FOR UPDATE'));
      expect(selectCall![1]).toEqual([tokenHash]);

      const updateCall = mockClient.query.mock.calls.find((c) => (c[0] as string).startsWith('UPDATE'));
      expect(updateCall![1]).toEqual(['token-1']);

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('returns null and rolls back when the token is not found (used, expired, or nonexistent)', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [] });
        return Promise.resolve();
      });

      const result = await consumeToken(rawToken);

      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE sms_magic_link_tokens'), expect.anything());
    });

    it('simulates the losing side of a concurrent double-click: the second call sees zero rows', async () => {
      // First call: row is locked, found unused, marked used.
      let used = false;
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FOR UPDATE')) {
          return Promise.resolve({
            rows: used ? [] : [{ id: 'token-1', phone_hash: 'hashed-phone', target_type: null, target_id: null }],
          });
        }
        if (sql.startsWith('UPDATE')) {
          used = true;
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      const first = await consumeToken(rawToken);
      const second = await consumeToken(rawToken);

      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it('rolls back and rethrows on a database error', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FOR UPDATE')) return Promise.reject(new Error('db down'));
        return Promise.resolve();
      });

      await expect(consumeToken(rawToken)).rejects.toThrow('db down');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('findOrCreateUserByPhoneHash (AC2, AC3, AC7)', () => {
    beforeEach(() => {
      mockSend.mockImplementation((command: MockCognitoCommand) => {
        if (command.__cmd === 'AdminCreateUser') {
          return Promise.resolve({ User: { Attributes: [{ Name: 'sub', Value: 'new-cognito-sub' }] } });
        }
        if (command.__cmd === 'AdminSetUserPassword') {
          return Promise.resolve({});
        }
        if (command.__cmd === 'AdminInitiateAuth') {
          return Promise.resolve({
            AuthenticationResult: {
              AccessToken: 'access-token',
              IdToken: 'id-token',
              RefreshToken: 'refresh-token',
            },
          });
        }
        return Promise.resolve({});
      });
    });

    it('creates a new Cognito user and local profile when none exists', async () => {
      mockFindUserByPhoneHash.mockResolvedValue(null);
      mockCreateUserProfileByPhoneHash.mockResolvedValue({
        id: 'new-cognito-sub',
        phone_hash: 'hashed-phone',
        display_name: 'New Member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await findOrCreateUserByPhoneHash('hashed-phone');

      expect(result.isNewUser).toBe(true);
      expect(result.userId).toBe('new-cognito-sub');
      expect(result.accessToken).toBe('access-token');
      expect(result.idToken).toBe('id-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(mockCreateUserProfileByPhoneHash).toHaveBeenCalledWith('new-cognito-sub', 'hashed-phone');

      const createCall = mockSend.mock.calls.find((c) => (c[0] as MockCognitoCommand).__cmd === 'AdminCreateUser');
      expect((createCall![0] as MockCognitoCommand).input.Username).toBe('phone_hashed-phone');
    });

    it('never sends the raw phone number as the Cognito Username', async () => {
      mockFindUserByPhoneHash.mockResolvedValue(null);
      mockCreateUserProfileByPhoneHash.mockResolvedValue({
        id: 'new-cognito-sub',
        phone_hash: 'hashed-phone',
        display_name: 'New Member',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await findOrCreateUserByPhoneHash('hashed-phone');

      for (const call of mockSend.mock.calls) {
        expect(JSON.stringify((call[0] as MockCognitoCommand).input)).not.toContain('+1');
      }
    });

    it('signs in an existing user without creating a duplicate account', async () => {
      mockFindUserByPhoneHash.mockResolvedValue({ id: 'existing-sub', phone_hash: 'hashed-phone' });

      const result = await findOrCreateUserByPhoneHash('hashed-phone');

      expect(result.isNewUser).toBe(false);
      expect(result.userId).toBe('existing-sub');
      expect(mockCreateUserProfileByPhoneHash).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalledWith(expect.objectContaining({ __cmd: 'AdminCreateUser' }));
    });

    it('sets a fresh one-time password before every sign-in, new or existing', async () => {
      mockFindUserByPhoneHash.mockResolvedValue({ id: 'existing-sub', phone_hash: 'hashed-phone' });

      await findOrCreateUserByPhoneHash('hashed-phone');

      const setPasswordCall = mockSend.mock.calls.find((c) => (c[0] as MockCognitoCommand).__cmd === 'AdminSetUserPassword');
      expect(setPasswordCall).toBeDefined();
      expect((setPasswordCall![0] as MockCognitoCommand).input.Permanent).toBe(true);
    });

    it('throws if Cognito does not return a complete token set', async () => {
      mockFindUserByPhoneHash.mockResolvedValue({ id: 'existing-sub', phone_hash: 'hashed-phone' });
      mockSend.mockImplementation((command: MockCognitoCommand) => {
        if (command.__cmd === 'AdminInitiateAuth') return Promise.resolve({ AuthenticationResult: {} });
        return Promise.resolve({});
      });

      await expect(findOrCreateUserByPhoneHash('hashed-phone')).rejects.toThrow();
    });

    it('throws and never authenticates if the local profile insert fails, instead of issuing a session for an orphaned Cognito user', async () => {
      mockFindUserByPhoneHash.mockResolvedValue(null);
      mockCreateUserProfileByPhoneHash.mockResolvedValue(null);

      await expect(findOrCreateUserByPhoneHash('hashed-phone')).rejects.toThrow(
        'Failed to create local user profile'
      );

      expect(mockSend).not.toHaveBeenCalledWith(expect.objectContaining({ __cmd: 'AdminSetUserPassword' }));
      expect(mockSend).not.toHaveBeenCalledWith(expect.objectContaining({ __cmd: 'AdminInitiateAuth' }));
    });
  });

  describe('addUserToTarget (AC4)', () => {
    it('adds the user to a group target and returns the group redirect path', async () => {
      const result = await addUserToTarget('user-1', 'group', 'group-1');

      expect(mockAddUserToGroup).toHaveBeenCalledWith('group-1', 'user-1', 'member');
      expect(result.redirectPath).toBe('/groups/group-1');
    });

    it("adds the user to the event's parent group and redirects to the event", async () => {
      mockQueryOne.mockResolvedValue({ group_id: 'group-2' });

      const result = await addUserToTarget('user-1', 'event', 'event-1');

      expect(mockAddUserToGroup).toHaveBeenCalledWith('group-2', 'user-1', 'member');
      expect(result.redirectPath).toBe('/groups/group-2/events/event-1');
    });

    it('falls back to /groups when the event no longer exists', async () => {
      mockQueryOne.mockResolvedValue(null);

      const result = await addUserToTarget('user-1', 'event', 'deleted-event');

      expect(mockAddUserToGroup).not.toHaveBeenCalled();
      expect(result.redirectPath).toBe('/groups');
    });

    it('falls back to /groups when there is no target (plain login link)', async () => {
      const result = await addUserToTarget('user-1', null, null);

      expect(mockAddUserToGroup).not.toHaveBeenCalled();
      expect(result.redirectPath).toBe('/groups');
    });
  });

  describe('signInViaMagicLink (end-to-end orchestration)', () => {
    it('returns INVALID_OR_EXPIRED_TOKEN when the token cannot be consumed', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FOR UPDATE')) return Promise.resolve({ rows: [] });
        return Promise.resolve();
      });

      const result = await signInViaMagicLink('bad-token');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('signs the user in and includes the target redirect on success', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FOR UPDATE')) {
          return Promise.resolve({
            rows: [{ id: 'token-1', phone_hash: 'hashed-phone', target_type: 'group', target_id: 'group-1' }],
          });
        }
        return Promise.resolve();
      });
      mockFindUserByPhoneHash.mockResolvedValue({ id: 'existing-sub', phone_hash: 'hashed-phone' });
      mockSend.mockImplementation((command: MockCognitoCommand) => {
        if (command.__cmd === 'AdminInitiateAuth') {
          return Promise.resolve({
            AuthenticationResult: { AccessToken: 'a', IdToken: 'i', RefreshToken: 'r' },
          });
        }
        return Promise.resolve({});
      });

      const result = await signInViaMagicLink('good-token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('a');
      expect(result.redirectPath).toBe('/groups/group-1');
      expect(mockAddUserToGroup).toHaveBeenCalledWith('group-1', 'existing-sub', 'member');
    });

    it('releases the token for retry if account creation/sign-in fails after the token was already consumed', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FOR UPDATE')) {
          return Promise.resolve({
            rows: [{ id: 'token-1', phone_hash: 'hashed-phone', target_type: null, target_id: null }],
          });
        }
        return Promise.resolve();
      });
      mockFindUserByPhoneHash.mockResolvedValue(null);
      mockCreateUserProfileByPhoneHash.mockResolvedValue(null); // forces findOrCreateUserByPhoneHash to throw

      await expect(signInViaMagicLink('good-token')).rejects.toThrow();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('used_at = NULL'),
        ['token-1']
      );
    });
  });
});
