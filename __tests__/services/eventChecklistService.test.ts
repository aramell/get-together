import {
  addChecklistItem,
  getChecklistItems,
  updateChecklistItem,
  deleteChecklistItem,
} from '@/lib/services/eventChecklistService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('eventChecklistService', () => {
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

  describe('addChecklistItem', () => {
    it('creates an item for a group member with no assignee', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member'); // creator's role
      mockClient.query.mockResolvedValueOnce({
        rows: [{ id: 'item-1', event_id: 'event-1', group_id: 'group-1', created_by: 'user-1', assigned_to: null, title: 'Book venue', is_checked: false, checked_by: null, checked_at: null, created_at: 'now', updated_at: 'now' }],
      });

      const result = await addChecklistItem('event-1', 'group-1', 'user-1', 'Book venue');

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Book venue');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rejects an empty title', async () => {
      const result = await addChecklistItem('event-1', 'group-1', 'user-1', '   ');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects when event does not exist in group', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      const result = await addChecklistItem('event-1', 'group-1', 'user-1', 'Book venue');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('rejects when the creator is not a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);
      const result = await addChecklistItem('event-1', 'group-1', 'user-1', 'Book venue');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('rejects when the assignee is not a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock)
        .mockResolvedValueOnce('member') // creator
        .mockResolvedValueOnce(null); // assignee
      const result = await addChecklistItem('event-1', 'group-1', 'user-1', 'Book venue', 'not-a-member');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('getChecklistItems', () => {
    it('returns items for a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', title: 'Book venue' }] });

      const result = await getChecklistItems('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('rejects a non-member (unlike the comments GET, which has no such check)', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await getChecklistItems('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('updateChecklistItem — check-toggle authorization', () => {
    const unassignedItem = { id: 'item-1', created_by: 'creator-1', assigned_to: null };
    const assignedItem = { id: 'item-1', created_by: 'creator-1', assigned_to: 'assignee-1' };

    it('allows any group member to check an unassigned item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [unassignedItem] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...unassignedItem, is_checked: true }] });

      const result = await updateChecklistItem('event-1', 'group-1', 'item-1', 'random-member', { is_checked: true });

      expect(result.success).toBe(true);
    });

    it('allows the assignee to check an assigned item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [assignedItem] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...assignedItem, is_checked: true }] });

      const result = await updateChecklistItem('event-1', 'group-1', 'item-1', 'assignee-1', { is_checked: true });

      expect(result.success).toBe(true);
    });

    it('rejects a non-assignee, non-admin group member checking an assigned item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [assignedItem] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateChecklistItem('event-1', 'group-1', 'item-1', 'someone-else', { is_checked: true });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('allows a group admin to check any item regardless of assignment', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [assignedItem] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...assignedItem, is_checked: true }] });

      const result = await updateChecklistItem('event-1', 'group-1', 'item-1', 'admin-user', { is_checked: true });

      expect(result.success).toBe(true);
    });
  });

  describe('updateChecklistItem — metadata-edit authorization', () => {
    const item = { id: 'item-1', created_by: 'creator-1', assigned_to: null };

    it('allows the creator to edit the title', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...item, title: 'New title' }] });

      const result = await updateChecklistItem('event-1', 'group-1', 'item-1', 'creator-1', { title: 'New title' });

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin editing the title', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateChecklistItem('event-1', 'group-1', 'item-1', 'random-member', { title: 'Hijacked' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('allows an admin to edit the title even if not the creator', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...item, title: 'Admin edit' }] });

      const result = await updateChecklistItem('event-1', 'group-1', 'item-1', 'admin-user', { title: 'Admin edit' });

      expect(result.success).toBe(true);
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateChecklistItem('event-1', 'group-1', 'missing-item', 'user-1', { title: 'x' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('deleteChecklistItem', () => {
    it('allows the creator to delete', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteChecklistItem('event-1', 'group-1', 'item-1', 'creator-1');

      expect(result.success).toBe(true);
    });

    it('allows an admin to delete even if not the creator', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteChecklistItem('event-1', 'group-1', 'item-1', 'admin-user');

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await deleteChecklistItem('event-1', 'group-1', 'item-1', 'random-member');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteChecklistItem('event-1', 'group-1', 'missing-item', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });
});
