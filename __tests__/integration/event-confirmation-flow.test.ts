import { updateEventRsvp, getEventConfirmationStatus, getEventMomentum } from '@/lib/services/eventService';
import { getClient } from '@/lib/db/client';

jest.mock('@/lib/db/client');

describe('Event Confirmation Flow (Integration)', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getClient as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('Full auto-confirmation flow', () => {
    it('should auto-confirm event when RSVP reaches threshold', async () => {
      const eventId = 'event-123';
      const groupId = 'group-123';
      const threshold = 3;

      // Simulate event with threshold=3
      mockClient.query
        // First call: Get event in updateEventRsvp
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              threshold,
              status: 'proposal',
              version: 1,
            },
          ],
        })
        // Second call: Check group membership
        .mockResolvedValueOnce({
          rows: [{ id: 'membership-1' }],
        })
        // Third call: Upsert RSVP (3rd person marking "in")
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rsvp-3',
              event_id: eventId,
              user_id: 'user-3',
              status: 'in',
              responded_at: '2026-03-16T10:00:00Z',
            },
          ],
        })
        // Fourth call: Get momentum counts (should be 3 in, triggering confirmation)
        .mockResolvedValueOnce({
          rows: [
            { status: 'in', count: '3' },
            { status: 'maybe', count: '0' },
            { status: 'out', count: '0' },
          ],
        })
        // Fifth call: Auto-confirm event
        .mockResolvedValueOnce({
          rows: [{ status: 'confirmed' }],
        });

      const result = await updateEventRsvp(eventId, 'user-3', 'in');

      expect(result.success).toBe(true);
      expect(result.data?.eventConfirmed).toBe(true);
      expect(result.data?.autoConfirmed).toBe(true);
      expect(result.data?.momentumCount.in).toBe(3);
    });

    it('should not re-confirm already confirmed event', async () => {
      const eventId = 'event-123';
      const groupId = 'group-123';
      const threshold = 3;

      // Simulate event already confirmed
      mockClient.query
        // Get event (already confirmed)
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              threshold,
              status: 'confirmed', // Already confirmed
              version: 1,
            },
          ],
        })
        // Check group membership
        .mockResolvedValueOnce({
          rows: [{ id: 'membership-1' }],
        })
        // Upsert RSVP
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rsvp-4',
              event_id: eventId,
              user_id: 'user-4',
              status: 'in',
              responded_at: '2026-03-16T10:05:00Z',
            },
          ],
        })
        // Get momentum counts
        .mockResolvedValueOnce({
          rows: [{ status: 'in', count: '4' }],
        });

      const result = await updateEventRsvp(eventId, 'user-4', 'in');

      expect(result.success).toBe(true);
      expect(result.data?.eventConfirmed).toBe(true);
      expect(result.data?.autoConfirmed).toBe(false); // Not auto-confirmed (already was)
    });

    it('should not confirm if threshold not met', async () => {
      const eventId = 'event-123';
      const groupId = 'group-123';
      const threshold = 5;

      // Simulate threshold=5 but only 2 people marked "in"
      mockClient.query
        // Get event
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              threshold,
              status: 'proposal',
              version: 1,
            },
          ],
        })
        // Check group membership
        .mockResolvedValueOnce({
          rows: [{ id: 'membership-1' }],
        })
        // Upsert RSVP
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rsvp-2',
              event_id: eventId,
              user_id: 'user-2',
              status: 'in',
              responded_at: '2026-03-16T09:50:00Z',
            },
          ],
        })
        // Get momentum counts (only 2, need 5)
        .mockResolvedValueOnce({
          rows: [
            { status: 'in', count: '2' },
            { status: 'maybe', count: '1' },
            { status: 'out', count: '0' },
          ],
        });

      const result = await updateEventRsvp(eventId, 'user-2', 'in');

      expect(result.success).toBe(true);
      expect(result.data?.eventConfirmed).toBe(false);
      expect(result.data?.autoConfirmed).toBeFalsy();
    });
  });

  describe('Event confirmation status tracking', () => {
    it('should return confirmed status after auto-confirmation', async () => {
      const eventId = 'event-123';

      mockClient.query
        // Get event
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              status: 'confirmed',
              threshold: 5,
              confirmed_at: '2026-03-16T10:00:00Z',
            },
          ],
        })
        // Get momentum counts
        .mockResolvedValueOnce({
          rows: [
            { status: 'in', count: '5' },
            { status: 'maybe', count: '0' },
            { status: 'out', count: '0' },
          ],
        });

      const result = await getEventConfirmationStatus(eventId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('confirmed');
      expect(result.data?.confirmedAt).toBe('2026-03-16T10:00:00Z');
      expect(result.data?.momentumCount.in).toBe(5);
    });

    it('should return proposal status if threshold not met', async () => {
      const eventId = 'event-456';

      mockClient.query
        // Get event
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              status: 'proposal',
              threshold: 10,
              confirmed_at: null,
            },
          ],
        })
        // Get momentum counts
        .mockResolvedValueOnce({
          rows: [
            { status: 'in', count: '3' },
            { status: 'maybe', count: '2' },
            { status: 'out', count: '1' },
          ],
        });

      const result = await getEventConfirmationStatus(eventId);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('proposal');
      expect(result.data?.confirmedAt).toBeNull();
      expect(result.data?.momentumCount.in).toBe(3);
    });
  });

  describe('RSVP changes after confirmation', () => {
    it('should handle RSVP change after event is already confirmed', async () => {
      const eventId = 'event-789';
      const groupId = 'group-123';

      // User changes from "in" to "out" after confirmation
      mockClient.query
        // Get event (confirmed)
        .mockResolvedValueOnce({
          rows: [
            {
              id: eventId,
              group_id: groupId,
              threshold: 5,
              status: 'confirmed', // Already confirmed
              version: 1,
            },
          ],
        })
        // Check group membership
        .mockResolvedValueOnce({
          rows: [{ id: 'membership-1' }],
        })
        // Upsert RSVP (change to "out")
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rsvp-change',
              event_id: eventId,
              user_id: 'user-who-changes',
              status: 'out',
              responded_at: '2026-03-16T11:00:00Z',
            },
          ],
        })
        // Get momentum counts (count drops to 4)
        .mockResolvedValueOnce({
          rows: [
            { status: 'in', count: '4' },
            { status: 'maybe', count: '0' },
            { status: 'out', count: '1' },
          ],
        });

      const result = await updateEventRsvp(eventId, 'user-who-changes', 'out');

      expect(result.success).toBe(true);
      expect(result.data?.eventConfirmed).toBe(true); // Event stays confirmed
      expect(result.data?.autoConfirmed).toBeFalsy(); // No re-confirmation
      expect(result.data?.momentumCount.in).toBe(4); // Count updated
    });
  });
});
