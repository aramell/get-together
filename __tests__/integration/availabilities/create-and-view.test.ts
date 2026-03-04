import {
  createAvailability,
  checkDuplicateAvailability,
  getGroupAvailabilities,
} from '@/lib/services/availabilityService';
import * as queriesModule from '@/lib/db/queries';

jest.mock('@/lib/db/queries');

describe('Integration: Availability Creation and Retrieval', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockGroupId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create availability with valid input', async () => {
    const mockAvailability = {
      id: 'avail-1',
      user_id: mockUserId,
      group_id: mockGroupId,
      start_time: '2026-03-05T10:00:00Z',
      end_time: '2026-03-05T11:00:00Z',
      status: 'free',
      version: 1,
      created_at: '2026-03-04T00:00:00Z',
      updated_at: '2026-03-04T00:00:00Z',
    };

    (queriesModule.createAvailability as jest.Mock).mockResolvedValue(
      mockAvailability
    );
    (queriesModule.checkDuplicateAvailability as jest.Mock).mockResolvedValue(
      null
    );

    const result = await createAvailability(
      mockUserId,
      mockGroupId,
      {
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAvailability);
  });

  it('should reject availability with duplicate time block', async () => {
    const existingAvailability = {
      id: 'avail-1',
      user_id: mockUserId,
      group_id: mockGroupId,
      start_time: '2026-03-05T10:00:00Z',
      end_time: '2026-03-05T11:00:00Z',
      status: 'free',
    };

    (queriesModule.checkDuplicateAvailability as jest.Mock).mockResolvedValue(
      existingAvailability
    );

    const result = await createAvailability(
      mockUserId,
      mockGroupId,
      {
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CONFLICT');
    expect(result.data).toEqual(existingAvailability);
  });

  it('should fetch group availabilities within date range', async () => {
    const mockAvailabilities = [
      {
        id: 'avail-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        user_email: 'john@example.com',
        group_id: mockGroupId,
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
        version: 1,
        created_at: '2026-03-04T00:00:00Z',
        updated_at: '2026-03-04T00:00:00Z',
      },
      {
        id: 'avail-2',
        user_id: 'user-2',
        user_name: 'Jane Smith',
        user_email: 'jane@example.com',
        group_id: mockGroupId,
        start_time: '2026-03-05T14:00:00Z',
        end_time: '2026-03-05T15:00:00Z',
        status: 'busy',
        version: 1,
        created_at: '2026-03-04T00:00:00Z',
        updated_at: '2026-03-04T00:00:00Z',
      },
    ];

    (queriesModule.getGroupAvailabilities as jest.Mock).mockResolvedValue(
      mockAvailabilities
    );

    const result = await getGroupAvailabilities(
      mockGroupId,
      '2026-03-01T00:00:00Z',
      '2026-03-31T23:59:59Z'
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0].status).toBe('free');
    expect(result.data?.[1].status).toBe('busy');
  });

  it('should handle multiple availabilities for same user on different times', async () => {
    (queriesModule.checkDuplicateAvailability as jest.Mock).mockResolvedValue(
      null
    );

    const mockAvail1 = {
      id: 'avail-1',
      user_id: mockUserId,
      group_id: mockGroupId,
      start_time: '2026-03-05T10:00:00Z',
      end_time: '2026-03-05T11:00:00Z',
      status: 'free',
      version: 1,
      created_at: '2026-03-04T00:00:00Z',
      updated_at: '2026-03-04T00:00:00Z',
    };

    (queriesModule.createAvailability as jest.Mock).mockResolvedValue(
      mockAvail1
    );

    const result1 = await createAvailability(
      mockUserId,
      mockGroupId,
      {
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }
    );

    expect(result1.success).toBe(true);

    // Second availability at different time
    const mockAvail2 = {
      ...mockAvail1,
      id: 'avail-2',
      start_time: '2026-03-05T14:00:00Z',
      end_time: '2026-03-05T15:00:00Z',
    };

    (queriesModule.createAvailability as jest.Mock).mockResolvedValue(
      mockAvail2
    );

    const result2 = await createAvailability(
      mockUserId,
      mockGroupId,
      {
        start_time: '2026-03-05T14:00:00Z',
        end_time: '2026-03-05T15:00:00Z',
        status: 'free',
      }
    );

    expect(result2.success).toBe(true);
    expect(result2.data?.id).not.toBe(result1.data?.id);
  });

  it('should include user information in group availabilities', async () => {
    const mockAvailabilities = [
      {
        id: 'avail-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        user_email: 'john@example.com',
        group_id: mockGroupId,
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
        version: 1,
        created_at: '2026-03-04T00:00:00Z',
        updated_at: '2026-03-04T00:00:00Z',
      },
    ];

    (queriesModule.getGroupAvailabilities as jest.Mock).mockResolvedValue(
      mockAvailabilities
    );

    const result = await getGroupAvailabilities(
      mockGroupId,
      '2026-03-01T00:00:00Z',
      '2026-03-31T23:59:59Z'
    );

    expect(result.success).toBe(true);
    expect(result.data?.[0]).toHaveProperty('user_name');
    expect(result.data?.[0]).toHaveProperty('user_email');
    expect(result.data?.[0].user_name).toBe('John Doe');
  });

  it('should validate input before creating availability', async () => {
    const result = await createAvailability(
      mockUserId,
      mockGroupId,
      {
        start_time: 'invalid-date',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free' as any,
      } as any
    );

    // Should fail validation
    expect(result.success).toBe(false);
    expect(result.errorCode).toContain('ERROR');
  });

  it('should validate that end_time is after start_time', async () => {
    const result = await createAvailability(
      mockUserId,
      mockGroupId,
      {
        start_time: '2026-03-05T11:00:00Z',
        end_time: '2026-03-05T10:00:00Z', // Before start time
        status: 'free',
      } as any
    );

    expect(result.success).toBe(false);
  });

  it('should validate status is either free or busy', async () => {
    const result = await createAvailability(
      mockUserId,
      mockGroupId,
      {
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'maybe' as any, // Invalid status
      } as any
    );

    expect(result.success).toBe(false);
  });

  it('should handle empty availabilities result', async () => {
    (queriesModule.getGroupAvailabilities as jest.Mock).mockResolvedValue([]);

    const result = await getGroupAvailabilities(
      mockGroupId,
      '2026-03-01T00:00:00Z',
      '2026-03-31T23:59:59Z'
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(0);
  });

  it('should order availabilities by start time', async () => {
    const mockAvailabilities = [
      {
        id: 'avail-1',
        user_id: 'user-1',
        user_name: 'John Doe',
        user_email: 'john@example.com',
        group_id: mockGroupId,
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
        version: 1,
        created_at: '2026-03-04T00:00:00Z',
        updated_at: '2026-03-04T00:00:00Z',
      },
      {
        id: 'avail-2',
        user_id: 'user-2',
        user_name: 'Jane Smith',
        user_email: 'jane@example.com',
        group_id: mockGroupId,
        start_time: '2026-03-05T14:00:00Z',
        end_time: '2026-03-05T15:00:00Z',
        status: 'busy',
        version: 1,
        created_at: '2026-03-04T00:00:00Z',
        updated_at: '2026-03-04T00:00:00Z',
      },
    ];

    (queriesModule.getGroupAvailabilities as jest.Mock).mockResolvedValue(
      mockAvailabilities
    );

    const result = await getGroupAvailabilities(
      mockGroupId,
      '2026-03-01T00:00:00Z',
      '2026-03-31T23:59:59Z'
    );

    expect(result.success).toBe(true);
    expect(result.data?.[0].start_time).toBeLessThan(result.data?.[1].start_time || '');
  });
});
