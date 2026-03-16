import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createEvent, getEventMomentum } from '@/lib/services/eventService';

// Mock database client
jest.mock('@/lib/db/client', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getUserGroupRole: jest.fn(),
}));

const { getClient } = require('@/lib/db/client');
const { getUserGroupRole } = require('@/lib/db/queries');

describe('Event Service - createEvent', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const validGroupId = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '660e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    getUserGroupRole.mockClear();
  });

  describe('Successful event creation', () => {
    it('should create event with all fields and auto-RSVP creator as "in"', async () => {
      const eventData = {
        title: 'Pizza Night at Downtown',
        date: '2026-04-20T19:00:00Z',
        threshold: 5,
        description: 'Join us for a fun evening!',
      };

      getUserGroupRole.mockResolvedValue('member');

      const eventId = '770e8400-e29b-41d4-a716-446655440002';
      const rsvpId = '880e8400-e29b-41d4-a716-446655440003';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: eventId,
            group_id: validGroupId,
            created_by: validUserId,
            title: eventData.title,
            description: eventData.description,
            date: eventData.date,
            threshold: eventData.threshold,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: rsvpId,
            event_id: eventId,
            user_id: validUserId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          }],
        });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Event proposed successfully');
      expect(result.data?.event.title).toBe(eventData.title);
      expect(result.data?.event.threshold).toBe(5);
      expect(result.data?.rsvp.status).toBe('in');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create event with minimal fields (no threshold, no description)', async () => {
      const eventData = {
        title: 'Hiking Trip',
        date: '2026-05-10T08:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('admin');

      const eventId = '990e8400-e29b-41d4-a716-446655440004';
      const rsvpId = 'aa0e8400-e29b-41d4-a716-446655440005';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: eventId,
            group_id: validGroupId,
            created_by: validUserId,
            title: eventData.title,
            description: null,
            date: eventData.date,
            threshold: null,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: rsvpId,
            event_id: eventId,
            user_id: validUserId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          }],
        });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(true);
      expect(result.data?.event.description).toBeNull();
      expect(result.data?.event.threshold).toBeNull();
    });
  });

  describe('Validation errors', () => {
    it('should reject event with invalid group ID', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      const result = await createEvent('', validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('Group ID is required');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should reject event with invalid user ID', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      const result = await createEvent(validGroupId, '', eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toBe('User ID is required');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should reject event with missing title', async () => {
      const eventData = {
        title: '',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('Event title is required');
    });

    it('should reject event with title exceeding 255 characters', async () => {
      const eventData = {
        title: 'A'.repeat(256),
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('255 characters');
    });

    it('should reject event with missing date', async () => {
      const eventData = {
        title: 'Test Event',
        date: '',
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject event with date in the past', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2020-01-01T00:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('future');
    });

    it('should reject event with invalid threshold (zero)', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
        threshold: 0,
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('greater than 0');
    });

    it('should reject event with invalid threshold (negative)', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
        threshold: -5,
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject event with threshold exceeding 1000', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
        threshold: 1001,
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('too large');
    });

    it('should reject event with description exceeding 2000 characters', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
        description: 'A'.repeat(2001),
      };

      getUserGroupRole.mockResolvedValue('member');

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('2000');
    });
  });

  describe('Authorization errors', () => {
    it('should reject if user is not a group member', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue(null);

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(result.message).toContain('group member');
    });
  });

  describe('Database errors', () => {
    it('should handle event creation database failure', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
      expect(result.message).toContain('Failed to create event');
    });

    it('should handle RSVP creation database failure', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      const eventId = '770e8400-e29b-41d4-a716-446655440002';

      getUserGroupRole.mockResolvedValue('member');
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: eventId,
            group_id: validGroupId,
            created_by: validUserId,
            title: eventData.title,
            description: null,
            date: eventData.date,
            threshold: null,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
      expect(result.message).toContain('RSVP');
    });

    it('should handle duplicate event constraint violation', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');
      mockClient.query.mockRejectedValueOnce(
        new Error('unique constraint "uk_event_date" violated')
      );

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFLICT');
      expect(result.message).toContain('already exists');
    });

    it('should handle generic database errors', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');
      mockClient.query.mockRejectedValueOnce(
        new Error('Database connection lost')
      );

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should always release database connection', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');
      mockClient.query.mockRejectedValueOnce(new Error('DB error'));

      await createEvent(validGroupId, validUserId, eventData);

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('RSVP auto-creation', () => {
    it('should auto-create RSVP with status "in" for event creator', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');

      const eventId = '770e8400-e29b-41d4-a716-446655440002';
      const rsvpId = '880e8400-e29b-41d4-a716-446655440003';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: eventId,
            group_id: validGroupId,
            created_by: validUserId,
            title: eventData.title,
            description: null,
            date: eventData.date,
            threshold: null,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: rsvpId,
            event_id: eventId,
            user_id: validUserId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          }],
        });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(true);
      expect(result.data?.rsvp.user_id).toBe(validUserId);
      expect(result.data?.rsvp.status).toBe('in');
      expect(result.data?.rsvp.event_id).toBe(eventId);
    });
  });

  describe('Edge cases', () => {
    it('should handle description with special characters', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
        description: 'Test with special chars: @#$%^&*()',
      };

      getUserGroupRole.mockResolvedValue('member');

      const eventId = '770e8400-e29b-41d4-a716-446655440002';
      const rsvpId = '880e8400-e29b-41d4-a716-446655440003';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: eventId,
            group_id: validGroupId,
            created_by: validUserId,
            title: eventData.title,
            description: eventData.description,
            date: eventData.date,
            threshold: null,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: rsvpId,
            event_id: eventId,
            user_id: validUserId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          }],
        });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(true);
      expect(result.data?.event.description).toBe(eventData.description);
    });

    it('should handle title with whitespace trimming', async () => {
      const eventData = {
        title: '  Test Event  ',
        date: '2026-04-20T19:00:00Z',
      };

      getUserGroupRole.mockResolvedValue('member');

      const eventId = '770e8400-e29b-41d4-a716-446655440002';
      const rsvpId = '880e8400-e29b-41d4-a716-446655440003';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: eventId,
            group_id: validGroupId,
            created_by: validUserId,
            title: 'Test Event',
            description: null,
            date: eventData.date,
            threshold: null,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: rsvpId,
            event_id: eventId,
            user_id: validUserId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          }],
        });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(true);
    });

    it('should handle maximum threshold value (1000)', async () => {
      const eventData = {
        title: 'Test Event',
        date: '2026-04-20T19:00:00Z',
        threshold: 1000,
      };

      getUserGroupRole.mockResolvedValue('member');

      const eventId = '770e8400-e29b-41d4-a716-446655440002';
      const rsvpId = '880e8400-e29b-41d4-a716-446655440003';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            id: eventId,
            group_id: validGroupId,
            created_by: validUserId,
            title: eventData.title,
            description: null,
            date: eventData.date,
            threshold: 1000,
            status: 'proposal',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: rsvpId,
            event_id: eventId,
            user_id: validUserId,
            status: 'in',
            responded_at: '2026-03-16T10:00:00Z',
          }],
        });

      const result = await createEvent(validGroupId, validUserId, eventData);

      expect(result.success).toBe(true);
      expect(result.data?.event.threshold).toBe(1000);
    });
  });
});

describe('Event Service - getEventMomentum', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const eventId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
    getClient.mockResolvedValue(mockClient);
    mockClient.query.mockClear();
    mockClient.release.mockClear();
  });

  it('should return correct momentum counts', async () => {
    mockClient.query
      .mockResolvedValueOnce({
        rows: [{
          threshold: 5,
          status: 'proposal',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { status: 'in', count: '8' },
          { status: 'maybe', count: '3' },
          { status: 'out', count: '2' },
        ],
      });

    const result = await getEventMomentum(eventId);

    expect(result.success).toBe(true);
    expect(result.data?.in).toBe(8);
    expect(result.data?.maybe).toBe(3);
    expect(result.data?.out).toBe(2);
    expect(result.data?.threshold).toBe(5);
  });

  it('should indicate threshold is met when "in" count >= threshold', async () => {
    mockClient.query
      .mockResolvedValueOnce({
        rows: [{
          threshold: 5,
          status: 'proposal',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { status: 'in', count: '5' },
        ],
      });

    const result = await getEventMomentum(eventId);

    expect(result.success).toBe(true);
    expect(result.data?.thresholdMet).toBe(true);
  });

  it('should indicate threshold not met when "in" count < threshold', async () => {
    mockClient.query
      .mockResolvedValueOnce({
        rows: [{
          threshold: 10,
          status: 'proposal',
        }],
      })
      .mockResolvedValueOnce({
        rows: [
          { status: 'in', count: '4' },
        ],
      });

    const result = await getEventMomentum(eventId);

    expect(result.success).toBe(true);
    expect(result.data?.thresholdMet).toBe(false);
  });

  it('should handle event not found', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    const result = await getEventMomentum(eventId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
