import {
  generatePublicEventLink,
  revokePublicEventLink,
} from '@/lib/services/publicEventService';
import { getClient } from '@/lib/db/client';
import { updateEventPublicToken } from '@/lib/db/queries';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('publicEventService', () => {
  let mockClient: { query: jest.Mock; release: jest.Mock };

  const eventId = 'event-1';
  const creatorId = 'user-creator';
  const groupAdminId = 'user-group-admin';
  const outsiderId = 'user-outsider';

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  const mockAuthorizationLookup = () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ id: eventId, created_by: creatorId }] }) // event lookup
      .mockResolvedValueOnce({ rows: [{ created_by: groupAdminId }] }); // group lookup
  };

  describe('generatePublicEventLink', () => {
    it('returns NOT_FOUND when the event does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await generatePublicEventLink(eventId, creatorId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('returns FORBIDDEN for a user who is neither creator nor group admin', async () => {
      mockAuthorizationLookup();

      const result = await generatePublicEventLink(eventId, outsiderId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(updateEventPublicToken).not.toHaveBeenCalled();
    });

    it('authorizes the group admin even when they are not the event creator', async () => {
      mockAuthorizationLookup();
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no existing token

      const result = await generatePublicEventLink(eventId, groupAdminId);

      expect(result.success).toBe(true);
      expect(updateEventPublicToken).toHaveBeenCalledWith(eventId, expect.any(String));
    });

    it('returns the existing token instead of generating a new one', async () => {
      mockAuthorizationLookup();
      mockClient.query.mockResolvedValueOnce({ rows: [{ public_token: 'existing-token' }] });

      const result = await generatePublicEventLink(eventId, creatorId);

      expect(result.success).toBe(true);
      expect(result.publicToken).toBe('existing-token');
      expect(result.publicUrl).toBe('/events/public/existing-token');
      expect(updateEventPublicToken).not.toHaveBeenCalled();
    });

    it('generates and persists a new token for the creator', async () => {
      mockAuthorizationLookup();
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // no existing token

      const result = await generatePublicEventLink(eventId, creatorId);

      expect(result.success).toBe(true);
      expect(result.publicToken).toBeTruthy();
      expect(result.publicUrl).toBe(`/events/public/${result.publicToken}`);
      expect(updateEventPublicToken).toHaveBeenCalledWith(eventId, result.publicToken);
    });
  });

  describe('revokePublicEventLink', () => {
    it('returns NOT_FOUND when the event does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await revokePublicEventLink(eventId, creatorId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('returns FORBIDDEN for a user who is neither creator nor group admin', async () => {
      mockAuthorizationLookup();

      const result = await revokePublicEventLink(eventId, outsiderId);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(updateEventPublicToken).not.toHaveBeenCalled();
    });

    it('clears the public token for the creator', async () => {
      mockAuthorizationLookup();

      const result = await revokePublicEventLink(eventId, creatorId);

      expect(result.success).toBe(true);
      expect(updateEventPublicToken).toHaveBeenCalledWith(eventId, null);
    });
  });
});
