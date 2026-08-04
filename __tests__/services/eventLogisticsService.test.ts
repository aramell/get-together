import {
  addLogisticsItem,
  getLogisticsItems,
  updateLogisticsItem,
  deleteLogisticsItem,
  claimLogisticsSeat,
  unclaimLogisticsSeat,
} from '@/lib/services/eventLogisticsService';
import { getClient } from '@/lib/db/client';
import { getUserGroupRole } from '@/lib/db/queries';

jest.mock('@/lib/db/client');
jest.mock('@/lib/db/queries');

describe('eventLogisticsService', () => {
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

  describe('addLogisticsItem', () => {
    it('creates a bring item with no assignee', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'item-1', event_id: 'event-1', group_id: 'group-1', created_by: 'user-1',
          category: 'bring', title: 'Speaker', assigned_to: null, capacity: null,
          created_at: 'now', updated_at: 'now',
        }],
      });

      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'bring', 'Speaker');

      expect(result.success).toBe(true);
      expect(result.data?.category).toBe('bring');
      expect(result.data?.claim_count).toBe(0);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('creates a carpool item with a driver and capacity', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock)
        .mockResolvedValueOnce('member') // creator
        .mockResolvedValueOnce('member'); // assignee (driver)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'item-1', event_id: 'event-1', group_id: 'group-1', created_by: 'user-1',
          category: 'carpool', title: 'Leaving downtown 5pm', assigned_to: 'driver-1', capacity: 4,
          created_at: 'now', updated_at: 'now',
        }],
      });

      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'carpool', 'Leaving downtown 5pm', 'driver-1', 4);

      expect(result.success).toBe(true);
      expect(result.data?.capacity).toBe(4);
    });

    it('rejects a carpool item without capacity', async () => {
      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'carpool', 'No capacity', 'driver-1');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects a carpool item without a driver', async () => {
      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'carpool', 'No driver', undefined, 4);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects an invalid category', async () => {
      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'invalid' as any, 'Title');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects an empty title', async () => {
      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'bring', '   ');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('rejects when event does not exist in group', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'bring', 'Speaker');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('rejects when the creator is not a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);
      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'bring', 'Speaker');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('rejects when the assignee is not a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock)
        .mockResolvedValueOnce('member') // creator
        .mockResolvedValueOnce(null); // assignee
      const result = await addLogisticsItem('event-1', 'group-1', 'user-1', 'bring', 'Speaker', 'not-a-member');
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('getLogisticsItems', () => {
    it('returns items with joined claims for a group member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 'item-1', event_id: 'event-1', group_id: 'group-1', created_by: 'user-1',
          category: 'carpool', title: 'Ride', assigned_to: 'driver-1', capacity: 2,
          created_at: 'now', updated_at: 'now',
          claims: [{ user_id: 'rider-1', claimed_at: 't1' }],
        }],
      });

      const result = await getLogisticsItems('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].claim_count).toBe(1);
    });

    it('rejects a non-member', async () => {
      mockEventExists();
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await getLogisticsItems('event-1', 'group-1', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('updateLogisticsItem — metadata-edit authorization', () => {
    const item = { id: 'item-1', created_by: 'creator-1', category: 'bring', assigned_to: null };

    it('allows the creator to edit the title', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...item, title: 'New title' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // claims

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'creator-1', { title: 'New title' });

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin editing the title', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'random-member', { title: 'Hijacked' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('allows an admin to edit the title even if not the creator', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...item, title: 'Admin edit' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // claims

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'admin-user', { title: 'Admin edit' });

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin reassigning a bring item to a third party', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'random-member', { assigned_to: 'someone-else' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await updateLogisticsItem('event-1', 'group-1', 'missing-item', 'user-1', { title: 'x' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('ignores capacity changes on a bring item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [item] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...item, capacity: null }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // claims

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'creator-1', { title: 'x', capacity: 5 });

      expect(result.success).toBe(true);
      // The UPDATE's SET clause should not assign capacity for a bring item
      // (it may still appear in the RETURNING column list).
      const updateCall = mockClient.query.mock.calls.find((c) => String(c[0]).startsWith('UPDATE'));
      const setClause = String(updateCall![0]).split('RETURNING')[0];
      expect(setClause).not.toContain('capacity');
    });
  });

  describe('updateLogisticsItem — bring-item claim/unclaim authorization', () => {
    const unassigned = { id: 'item-1', created_by: 'creator-1', category: 'bring', assigned_to: null };
    const assignedToMember = { id: 'item-1', created_by: 'creator-1', category: 'bring', assigned_to: 'claimant-1' };

    it('allows any group member to claim an unassigned bring item for themselves', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [unassigned] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...unassigned, assigned_to: 'random-member' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // claims

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'random-member', { assigned_to: 'random-member' });

      expect(result.success).toBe(true);
    });

    it('allows the current assignee to unclaim their own bring item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [assignedToMember] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...assignedToMember, assigned_to: null }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // claims

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'claimant-1', { assigned_to: null });

      expect(result.success).toBe(true);
    });

    it('rejects a non-assignee, non-admin trying to unclaim someone else\'s bring item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [assignedToMember] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'someone-else', { assigned_to: null });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('rejects a member trying to claim an already-assigned bring item for themselves', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [assignedToMember] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'someone-else', { assigned_to: 'someone-else' });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('allows an admin to unclaim any bring item regardless of assignment', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [assignedToMember] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [{ ...assignedToMember, assigned_to: null }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // claims

      const result = await updateLogisticsItem('event-1', 'group-1', 'item-1', 'admin-user', { assigned_to: null });

      expect(result.success).toBe(true);
    });
  });

  describe('deleteLogisticsItem', () => {
    it('allows the creator to delete', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteLogisticsItem('event-1', 'group-1', 'item-1', 'creator-1');

      expect(result.success).toBe(true);
    });

    it('allows an admin to delete even if not the creator', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('admin');
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteLogisticsItem('event-1', 'group-1', 'item-1', 'admin-user');

      expect(result.success).toBe(true);
    });

    it('rejects a non-creator, non-admin', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ created_by: 'creator-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');

      const result = await deleteLogisticsItem('event-1', 'group-1', 'item-1', 'random-member');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await deleteLogisticsItem('event-1', 'group-1', 'missing-item', 'user-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('claimLogisticsSeat', () => {
    it('claims a seat when under capacity', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', category: 'carpool', capacity: 4 }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // count
      mockClient.query.mockResolvedValueOnce({ rows: [{ user_id: 'rider-1', claimed_at: 'now' }] }); // insert
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await claimLogisticsSeat('event-1', 'group-1', 'item-1', 'rider-1');

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('rejects with CAPACITY_REACHED (mapped to 409 in the route) when full', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', category: 'carpool', capacity: 2 }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '2' }] }); // count == capacity

      const result = await claimLogisticsSeat('event-1', 'group-1', 'item-1', 'rider-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CAPACITY_REACHED');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('rejects a duplicate claim from the unique constraint violation', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', category: 'carpool', capacity: 4 }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // count
      const uniqueViolation: any = new Error('duplicate key value violates unique constraint');
      uniqueViolation.code = '23505';
      mockClient.query.mockRejectedValueOnce(uniqueViolation); // insert fails
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const result = await claimLogisticsSeat('event-1', 'group-1', 'item-1', 'rider-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFLICT');
    });

    it('rejects claiming a bring item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', category: 'bring', capacity: null }] });

      const result = await claimLogisticsSeat('event-1', 'group-1', 'item-1', 'rider-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await claimLogisticsSeat('event-1', 'group-1', 'missing-item', 'rider-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('rejects a non-member', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1', category: 'carpool', capacity: 4 }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce(null);

      const result = await claimLogisticsSeat('event-1', 'group-1', 'item-1', 'rider-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('unclaimLogisticsSeat', () => {
    it('removes the caller\'s own claim', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await unclaimLogisticsSeat('event-1', 'group-1', 'item-1', 'rider-1');

      expect(result.success).toBe(true);
    });

    it('returns NOT_FOUND when the caller had no claim', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'item-1' }] });
      (getUserGroupRole as jest.Mock).mockResolvedValueOnce('member');
      mockClient.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await unclaimLogisticsSeat('event-1', 'group-1', 'item-1', 'rider-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('returns NOT_FOUND for a nonexistent item', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await unclaimLogisticsSeat('event-1', 'group-1', 'missing-item', 'rider-1');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });
});
