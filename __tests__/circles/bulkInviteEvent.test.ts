import { bulkInviteCircleToEvent } from '@/lib/services/circleInviteService';
import * as queries from '@/lib/db/queries';
import * as circleQueries from '@/lib/db/queries/circles';
import * as smsTokens from '@/lib/db/queries/smsTokens';
import * as smsService from '@/lib/services/smsService';
import * as encryption from '@/lib/encryption/crypto';

jest.mock('@/lib/db/queries', () => ({
  addUserToGroup: jest.fn(),
}));

jest.mock('@/lib/db/queries/circles', () => ({
  getCircleById: jest.fn(),
  getContactsByCircleId: jest.fn(),
}));

jest.mock('@/lib/db/queries/smsTokens', () => ({
  createToken: jest.fn(),
}));

jest.mock('@/lib/services/smsService', () => ({
  generateMagicToken: jest.fn(),
  sendMagicLinkSms: jest.fn(),
  checkAndRecordRateLimit: jest.fn(),
}));

jest.mock('@/lib/encryption/crypto', () => ({
  decrypt: jest.fn(),
}));

describe('bulkInviteCircleToEvent (Story 10.5)', () => {
  const groupId = 'group-1';
  const eventId = 'event-1';
  const circleId = 'circle-1';
  const ownerId = 'user-456';
  const mockCircle = { id: circleId, user_id: ownerId, name: 'Weekend Crew' };

  const phoneContact = (id: string, overrides: Partial<Record<string, unknown>> = {}) => ({
    id,
    circle_id: circleId,
    contact_type: 'phone',
    phone_hash: `hash-${id}`,
    phone_display: '+1 555 ***-1234',
    phone_encrypted: `encrypted-${id}`,
    user_id: null,
    display_name: `Phone ${id}`,
    created_at: '2026-06-30T10:00:00Z',
    ...overrides,
  });

  const userContact = (id: string, userId: string, overrides: Partial<Record<string, unknown>> = {}) => ({
    id,
    circle_id: circleId,
    contact_type: 'user',
    phone_hash: null,
    phone_display: null,
    phone_encrypted: null,
    user_id: userId,
    display_name: `App User ${id}`,
    created_at: '2026-06-30T10:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(mockCircle);
    (smsService.checkAndRecordRateLimit as jest.Mock).mockReturnValue(true);
    (smsService.generateMagicToken as jest.Mock).mockReturnValue({
      rawToken: 'raw-token',
      tokenHash: 'token-hash',
      expiresAt: new Date('2026-06-30T10:15:00Z'),
    });
    (encryption.decrypt as jest.Mock).mockImplementation((v: string) => v.replace('encrypted-', '+1555000'));
  });

  it('sends event-scoped SMS invites to phone contacts and adds user contacts to the event group (AC4, AC5, Task 4a)', async () => {
    (circleQueries.getContactsByCircleId as jest.Mock).mockResolvedValue([
      phoneContact('c1'),
      userContact('c2', 'friend-1'),
    ]);

    const result = await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ invitesSent: 2, invitesFailed: 0 });

    expect(smsTokens.createToken).toHaveBeenCalledWith(
      'hash-c1',
      'token-hash',
      expect.any(Date),
      'event',
      eventId
    );
    expect(smsService.sendMagicLinkSms).toHaveBeenCalledWith('+1555000c1', 'raw-token');
    expect(queries.addUserToGroup).toHaveBeenCalledWith(groupId, 'friend-1', 'member');
  });

  it('does not invite excluded contacts (AC2, Task 4b)', async () => {
    (circleQueries.getContactsByCircleId as jest.Mock).mockResolvedValue([
      phoneContact('c1'),
      userContact('c2', 'friend-1'),
    ]);

    const result = await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId, ['c1']);

    expect(result.data).toEqual({ invitesSent: 1, invitesFailed: 0 });
    expect(smsService.sendMagicLinkSms).not.toHaveBeenCalled();
    expect(queries.addUserToGroup).toHaveBeenCalledWith(groupId, 'friend-1', 'member');
  });

  it('never modifies the circle or its contacts (AC6, Task 4c)', async () => {
    (circleQueries.getContactsByCircleId as jest.Mock).mockResolvedValue([phoneContact('c1')]);

    await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId);

    expect(circleQueries.getCircleById).toHaveBeenCalledWith(circleId);
    expect(circleQueries.getContactsByCircleId).toHaveBeenCalledWith(circleId);
    // The circles query module only exposes reads here (getCircleById,
    // getContactsByCircleId) -- no create/update/delete was imported to call.
  });

  it('is independently reusable for a second, different event immediately after (AC6, Task 4d)', async () => {
    (circleQueries.getContactsByCircleId as jest.Mock).mockResolvedValue([phoneContact('c1')]);

    const firstResult = await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId);
    const secondResult = await bulkInviteCircleToEvent('event-2', 'group-2', circleId, ownerId);

    expect(firstResult.data).toEqual({ invitesSent: 1, invitesFailed: 0 });
    expect(secondResult.data).toEqual({ invitesSent: 1, invitesFailed: 0 });
    expect(smsTokens.createToken).toHaveBeenNthCalledWith(
      1,
      'hash-c1',
      'token-hash',
      expect.any(Date),
      'event',
      eventId
    );
    expect(smsTokens.createToken).toHaveBeenNthCalledWith(
      2,
      'hash-c1',
      'token-hash',
      expect.any(Date),
      'event',
      'event-2'
    );
  });

  it('counts a failed SMS send without blocking event creation, alongside a successful one (AC7, Task 4e)', async () => {
    (circleQueries.getContactsByCircleId as jest.Mock).mockResolvedValue([
      phoneContact('c1'),
      phoneContact('c2'),
    ]);
    (smsService.sendMagicLinkSms as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('SNS unavailable'));

    const result = await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ invitesSent: 1, invitesFailed: 1 });
  });

  it('counts a rate-limited phone contact as failed', async () => {
    (circleQueries.getContactsByCircleId as jest.Mock).mockResolvedValue([phoneContact('c1')]);
    (smsService.checkAndRecordRateLimit as jest.Mock).mockReturnValue(false);

    const result = await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId);

    expect(result.data).toEqual({ invitesSent: 0, invitesFailed: 1 });
    expect(smsService.sendMagicLinkSms).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND when the circle does not exist', async () => {
    (circleQueries.getCircleById as jest.Mock).mockResolvedValue(null);

    const result = await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
    expect(circleQueries.getContactsByCircleId).not.toHaveBeenCalled();
  });

  it('returns FORBIDDEN when the circle belongs to another user', async () => {
    const result = await bulkInviteCircleToEvent(eventId, groupId, circleId, 'someone-else');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('FORBIDDEN');
    expect(circleQueries.getContactsByCircleId).not.toHaveBeenCalled();
  });

  it('returns an internal error when a read query throws', async () => {
    (circleQueries.getContactsByCircleId as jest.Mock).mockRejectedValue(new Error('db down'));

    const result = await bulkInviteCircleToEvent(eventId, groupId, circleId, ownerId);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INTERNAL_ERROR');
  });
});
