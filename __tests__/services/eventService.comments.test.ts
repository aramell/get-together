import { addEventComment, getEventComments } from '@/lib/services/eventService';
import { getClient } from '@/lib/db/client';

// Mock database client
jest.mock('@/lib/db/client');

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

describe('Event Comment Service Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('getEventComments', () => {
    it('returns comments for an event in chronological order', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'comment-1',
            content: 'First comment',
            created_by: 'user-1',
            created_at: '2026-03-18T10:00:00Z',
            display_name: 'Alice',
            email: 'alice@example.com',
            avatar_url: 'https://example.com/alice.jpg',
          },
          {
            id: 'comment-2',
            content: 'Second comment',
            created_by: 'user-2',
            created_at: '2026-03-18T10:05:00Z',
            display_name: 'Bob',
            email: 'bob@example.com',
            avatar_url: 'https://example.com/bob.jpg',
          },
        ],
      });

      const result = await getEventComments('event-123', 'group-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].content).toBe('First comment');
      expect(result.data?.[1].content).toBe('Second comment');
      expect(result.data?.[0].creator?.display_name).toBe('Alice');
    });

    it('returns empty array if no comments exist', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getEventComments('event-123', 'group-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('returns 404 if event not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await getEventComments('nonexistent-event', 'group-123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('filters out soft-deleted comments', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'comment-1',
            content: 'Active comment',
            created_by: 'user-1',
            created_at: '2026-03-18T10:00:00Z',
            display_name: 'Alice',
            email: 'alice@example.com',
            avatar_url: null,
          },
        ],
      });

      const result = await getEventComments('event-123', 'group-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array)
      );
    });

    it('includes creator info with null values if user not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'comment-1',
            content: 'Comment',
            created_by: 'user-1',
            created_at: '2026-03-18T10:00:00Z',
            display_name: null,
            email: null,
            avatar_url: null,
          },
        ],
      });

      const result = await getEventComments('event-123', 'group-123');

      expect(result.success).toBe(true);
      expect(result.data?.[0].creator).toEqual({
        display_name: null,
        email: null,
        avatar_url: null,
      });
    });
  });

  describe('addEventComment', () => {
    it('creates a comment successfully', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'member-1' }],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'comment-1',
            event_id: 'event-123',
            group_id: 'group-123',
            created_by: 'user-1',
            content: 'Test comment',
            created_at: '2026-03-18T10:00:00Z',
          },
        ],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            display_name: 'Alice',
            email: 'alice@example.com',
            avatar_url: 'https://example.com/alice.jpg',
          },
        ],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // COMMIT

      const result = await addEventComment('event-123', 'group-123', 'user-1', 'Test comment');

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Test comment');
      expect(result.data?.creator?.display_name).toBe('Alice');
    });

    it('rejects empty comment', async () => {
      const result = await addEventComment('event-123', 'group-123', 'user-1', '');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('1 and 2000');
    });

    it('rejects comment with only whitespace', async () => {
      const result = await addEventComment('event-123', 'group-123', 'user-1', '   \n\t  ');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects comment exceeding 2000 characters', async () => {
      const longComment = 'a'.repeat(2001);
      const result = await addEventComment('event-123', 'group-123', 'user-1', longComment);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('2000 characters');
    });

    it('returns 404 if event not found', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await addEventComment('nonexistent-event', 'group-123', 'user-1', 'Comment');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('returns 403 if user not group member', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await addEventComment('event-123', 'group-123', 'user-1', 'Comment');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(result.message).toContain('group member');
    });

    it('rolls back transaction on insert failure', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'member-1' }],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockResolvedValueOnce({
        rows: [],
      }); // INSERT fails

      const result = await addEventComment('event-123', 'group-123', 'user-1', 'Comment');

      expect(result.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('handles database constraint error for empty content', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'member-1' }],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockRejectedValueOnce(
        new Error('check constraint "content_not_empty" is violated')
      );

      const result = await addEventComment('event-123', 'group-123', 'user-1', '   '); // Should fail earlier due to JS validation

      expect(result.success).toBe(false);
    });

    it('handles database constraint error for content length', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'event-123' }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'member-1' }],
      });
      mockClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockClient.query.mockRejectedValueOnce(
        new Error('check constraint "content_length_limit" is violated')
      );

      const longComment = 'a'.repeat(2001);
      const result = await addEventComment('event-123', 'group-123', 'user-1', longComment); // Should fail earlier

      expect(result.success).toBe(false);
    });

  });
});
