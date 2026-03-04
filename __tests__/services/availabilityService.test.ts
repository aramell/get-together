import { createRecurringAvailability } from '@/lib/services/availabilityService';
import * as queries from '@/lib/db/queries';

jest.mock('@/lib/db/queries');

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
const mockGroupId = '660e8400-e29b-41d4-a716-446655440000';

describe('availabilityService - Recurring Availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRecurringAvailability', () => {
    it('should create daily recurring availability for multiple occurrences', async () => {
      const startTime = '2026-03-05T09:00:00Z'; // Thursday
      const endTime = '2026-03-05T10:00:00Z';
      const recurringEndDate = '2026-03-07T09:00:00Z'; // Saturday (3 days)

      // Mock the responses for each occurrence
      (queries.checkDuplicateAvailability as jest.Mock).mockResolvedValue(null);
      (queries.createAvailability as jest.Mock)
        .mockResolvedValueOnce({
          id: '1',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        })
        .mockResolvedValueOnce({
          id: '2',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-06T09:00:00Z',
          end_time: '2026-03-06T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        })
        .mockResolvedValueOnce({
          id: '3',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-07T09:00:00Z',
          end_time: '2026-03-07T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        });

      const result = await createRecurringAvailability(
        mockUserId,
        mockGroupId,
        startTime,
        endTime,
        'busy',
        'daily',
        recurringEndDate
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(queries.createAvailability).toHaveBeenCalledTimes(3);
    });

    it('should create weekly recurring availability', async () => {
      const startTime = '2026-03-05T09:00:00Z'; // Thursday
      const endTime = '2026-03-05T10:00:00Z';
      const recurringEndDate = '2026-03-19T09:00:00Z'; // 2 weeks later (3 occurrences)

      (queries.checkDuplicateAvailability as jest.Mock).mockResolvedValue(null);
      (queries.createAvailability as jest.Mock)
        .mockResolvedValueOnce({
          id: '1',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        })
        .mockResolvedValueOnce({
          id: '2',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-12T09:00:00Z',
          end_time: '2026-03-12T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        })
        .mockResolvedValueOnce({
          id: '3',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-19T09:00:00Z',
          end_time: '2026-03-19T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        });

      const result = await createRecurringAvailability(
        mockUserId,
        mockGroupId,
        startTime,
        endTime,
        'busy',
        'weekly',
        recurringEndDate
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(queries.createAvailability).toHaveBeenCalledTimes(3);
    });

    it('should return error for invalid recurring pattern', async () => {
      const startTime = '2026-03-05T09:00:00Z';
      const endTime = '2026-03-05T10:00:00Z';
      const recurringEndDate = '2026-03-07T09:00:00Z';

      const result = await createRecurringAvailability(
        mockUserId,
        mockGroupId,
        startTime,
        endTime,
        'busy',
        'monthly' as any,
        recurringEndDate
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('INVALID_RECURRING_PATTERN');
    });

    it('should return error if recurring end date is before start time', async () => {
      const startTime = '2026-03-05T09:00:00Z';
      const endTime = '2026-03-05T10:00:00Z';
      const recurringEndDate = '2026-03-04T09:00:00Z'; // Before start time

      const result = await createRecurringAvailability(
        mockUserId,
        mockGroupId,
        startTime,
        endTime,
        'busy',
        'daily',
        recurringEndDate
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('INVALID_RECURRING_END_DATE');
    });

    it('should return error for invalid user ID', async () => {
      const result = await createRecurringAvailability(
        '',
        mockGroupId,
        '2026-03-05T09:00:00Z',
        '2026-03-05T10:00:00Z',
        'busy',
        'daily',
        '2026-03-07T09:00:00Z'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('INVALID_USER_ID');
    });

    it('should return error for invalid group ID', async () => {
      const result = await createRecurringAvailability(
        mockUserId,
        '',
        '2026-03-05T09:00:00Z',
        '2026-03-05T10:00:00Z',
        'busy',
        'daily',
        '2026-03-07T09:00:00Z'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('INVALID_GROUP_ID');
    });

    it('should handle partial failures when some occurrences conflict', async () => {
      const startTime = '2026-03-05T09:00:00Z';
      const endTime = '2026-03-05T10:00:00Z';
      const recurringEndDate = '2026-03-07T09:00:00Z';

      // First occurrence: no conflict
      // Second occurrence: conflict
      // Third occurrence: no conflict
      (queries.checkDuplicateAvailability as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'existing',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-06T09:00:00Z',
          end_time: '2026-03-06T10:00:00Z',
          status: 'free',
        })
        .mockResolvedValueOnce(null);

      (queries.createAvailability as jest.Mock)
        .mockResolvedValueOnce({
          id: '1',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-05T09:00:00Z',
          end_time: '2026-03-05T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        })
        .mockResolvedValueOnce({
          id: '3',
          user_id: mockUserId,
          group_id: mockGroupId,
          start_time: '2026-03-07T09:00:00Z',
          end_time: '2026-03-07T10:00:00Z',
          status: 'busy',
          version: 1,
          created_at: '2026-03-04T10:00:00Z',
          updated_at: '2026-03-04T10:00:00Z',
        });

      const result = await createRecurringAvailability(
        mockUserId,
        mockGroupId,
        startTime,
        endTime,
        'busy',
        'daily',
        recurringEndDate
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // 2 successful, 1 failed
      expect(result.message).toContain('Created 2 of 3');
    });

    it('should return error if all occurrences fail', async () => {
      const startTime = '2026-03-05T09:00:00Z';
      const endTime = '2026-03-05T10:00:00Z';
      const recurringEndDate = '2026-03-07T09:00:00Z';

      // All occurrences conflict
      (queries.checkDuplicateAvailability as jest.Mock).mockResolvedValue({
        id: 'existing',
        user_id: mockUserId,
        group_id: mockGroupId,
        start_time: startTime,
        end_time: endTime,
        status: 'free',
      });

      const result = await createRecurringAvailability(
        mockUserId,
        mockGroupId,
        startTime,
        endTime,
        'busy',
        'daily',
        recurringEndDate
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFLICT');
      expect(result.error).toBe('ALL_OCCURRENCES_FAILED');
    });

    it('should return error for invalid date format', async () => {
      const result = await createRecurringAvailability(
        mockUserId,
        mockGroupId,
        'not-a-date',
        '2026-03-05T10:00:00Z',
        'busy',
        'daily',
        '2026-03-07T09:00:00Z'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.error).toBe('INVALID_DATE_FORMAT');
    });
  });
});
