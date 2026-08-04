import {
  addTimelineItem,
  getTimelineItems,
  updateTimelineItem,
  deleteTimelineItem,
} from '@/lib/services/eventTimelineService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('eventTimelineService', () => {
  let mockClient: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    mockClient = { query: jest.fn(), release: jest.fn() };
    (getClient as jest.Mock).mockResolvedValue(mockClient);
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  const mockEventExists = () => {
    mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'event-1' }] }); // verifyEventInGroup
  };

  describe('addTimelineItem', () => {
    it('creates an item for a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'item-1',
          event_id: 'event-1',
          group_id: 'group-1',
          created_by: 'user-1',
          item_time: '2026-08-15T18:00:00.000Z',
          title: 'Arrive',
          description: null,
          created_at: 'now',
          updated_at: 'now',
        }],
      });

      const result = await addTimelineItem('event-1', 'group-1', 'user-1', '2026-08-15T18:00', 'Arrive');

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Arrive');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rejects an empty title', async () => {
      const result = await addTimelineItem('event-1', 'group-1', 'user-1', '2026-08-15T18:00', '   ');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid item_time', async () => {
      const result = await addTimelineItem('event-1', 'group-1', 'user-1', 'not-a-date', 'Arrive');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects when event does not exist in group', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      const result = await addTimelineItem('event-1', 'group-1', 'user-1', '2026-08-15T18:00', 'Arrive');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('rejects when the creator is not a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);
      const result = await addTimelineItem('event-1', 'group-1', 'user-1', '2026-08-15T18:00', 'Arrive');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('getTimelineItems', () => {
    it('returns items for a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', title: 'Arrive' }] });

      const result = await getTimelineItems('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('rejects a non-member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await getTimelineItems('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('returns NOT_FOUND when the event does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      const result = await getTimelineItems('event-1', 'group-1', 'user-1');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('updateTimelineItem', () => {
    const item = { id: 'item-1', created_by: 'creator-1' };

    it('allows the creator to edit', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...item, title: 'Updated' }] });

      const result = await updateTimelineItem('event-1', 'group-1', 'item-1', 'creator-1', { title: 'Updated' });

      expect(result.success).toBe(true);
    });

    it('allows an admin to edit even if not the creator', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...item, title: 'Admin edit' }] });

      const result = await updateTimelineItem('event-1', 'group-1', 'item-1', 'admin-user', { title: 'Admin edit' });

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin group member', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateTimelineItem('event-1', 'group-1', 'item-1', 'random-member', { title: 'Hijacked' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('rejects an invalid item_time', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateTimelineItem('event-1', 'group-1', 'item-1', 'creator-1', { item_time: 'bad' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateTimelineItem('event-1', 'group-1', 'missing-item', 'user-1', { title: 'x' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('deleteTimelineItem', () => {
    it('allows the creator to delete', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteTimelineItem('event-1', 'group-1', 'item-1', 'creator-1');

      expect(result.success).toBe(true);
    });

    it('allows an admin to delete even if not the creator', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteTimelineItem('event-1', 'group-1', 'item-1', 'admin-user');

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await deleteTimelineItem('event-1', 'group-1', 'item-1', 'random-member');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteTimelineItem('event-1', 'group-1', 'missing-item', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });
});
