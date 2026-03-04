import { POST, GET } from '@/app/api/groups/[groupId]/availabilities/route';
import { NextRequest } from 'next/server';
import * as queriesModule from '@/lib/db/queries';
import * as serviceModule from '@/lib/services/availabilityService';

jest.mock('@/lib/db/queries');
jest.mock('@/lib/services/availabilityService');

describe('POST /api/groups/[groupId]/availabilities', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockGroupId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const mockRequest = {
      headers: new Map([]),
      json: async () => ({
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.errorCode).toBe('NOT_AUTHENTICATED');
  });

  it('should return 400 if groupId is invalid UUID format', async () => {
    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      json: async () => ({
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, {
      params: Promise.resolve({ groupId: 'invalid-id' }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.errorCode).toBe('INVALID_GROUP_ID');
  });

  it('should return 404 if group does not exist', async () => {
    (queriesModule.getGroupById as jest.Mock).mockResolvedValue(null);

    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      json: async () => ({
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.errorCode).toBe('GROUP_NOT_FOUND');
  });

  it('should return 403 if user is not a group member', async () => {
    (queriesModule.getGroupById as jest.Mock).mockResolvedValue({
      id: mockGroupId,
      name: 'Test Group',
      description: null,
      created_by: 'other-user',
      invite_code: 'abc123',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    });

    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue(null);

    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      json: async () => ({
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.errorCode).toBe('NOT_GROUP_MEMBER');
  });

  it('should return 422 if validation fails', async () => {
    (queriesModule.getGroupById as jest.Mock).mockResolvedValue({
      id: mockGroupId,
      name: 'Test Group',
      description: null,
      created_by: mockUserId,
      invite_code: 'abc123',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    });

    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');

    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      json: async () => ({
        start_time: 'invalid-date',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(422);
    const json = await response.json();
    expect(json.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 409 if availability already exists', async () => {
    (queriesModule.getGroupById as jest.Mock).mockResolvedValue({
      id: mockGroupId,
      name: 'Test Group',
    });

    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');

    (serviceModule.createAvailability as jest.Mock).mockResolvedValue({
      success: false,
      message: 'This time is already marked as free',
      error: 'DUPLICATE_AVAILABILITY',
      errorCode: 'CONFLICT',
      data: {
        id: 'existing-id',
        user_id: mockUserId,
        group_id: mockGroupId,
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      },
    });

    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      json: async () => ({
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.errorCode).toBe('CONFLICT');
  });

  it('should create availability and return 201', async () => {
    (queriesModule.getGroupById as jest.Mock).mockResolvedValue({
      id: mockGroupId,
      name: 'Test Group',
    });

    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');

    const mockAvailability = {
      id: 'new-availability-id',
      user_id: mockUserId,
      group_id: mockGroupId,
      start_time: '2026-03-05T10:00:00Z',
      end_time: '2026-03-05T11:00:00Z',
      status: 'free',
      version: 1,
      created_at: '2026-03-04T00:00:00Z',
      updated_at: '2026-03-04T00:00:00Z',
    };

    (serviceModule.createAvailability as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Availability created successfully',
      data: mockAvailability,
    });

    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      json: async () => ({
        start_time: '2026-03-05T10:00:00Z',
        end_time: '2026-03-05T11:00:00Z',
        status: 'free',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockAvailability);
  });
});

describe('GET /api/groups/[groupId]/availabilities', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockGroupId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    const mockRequest = {
      headers: new Map([]),
      nextUrl: new URL('http://localhost/api/groups/123/availabilities?startDate=2026-03-01&endDate=2026-03-31'),
    } as unknown as NextRequest;

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.errorCode).toBe('NOT_AUTHENTICATED');
  });

  it('should return 400 if date parameters are missing', async () => {
    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      nextUrl: new URL('http://localhost/api/groups/123/availabilities'),
    } as unknown as NextRequest;

    (queriesModule.getGroupById as jest.Mock).mockResolvedValue({
      id: mockGroupId,
      name: 'Test Group',
    });

    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.errorCode).toBe('MISSING_PARAMS');
  });

  it('should return 400 if date format is invalid', async () => {
    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      nextUrl: new URL(
        'http://localhost/api/groups/123/availabilities?startDate=invalid&endDate=2026-03-31'
      ),
    } as unknown as NextRequest;

    (queriesModule.getGroupById as jest.Mock).mockResolvedValue({
      id: mockGroupId,
      name: 'Test Group',
    });

    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.errorCode).toBe('INVALID_DATE_FORMAT');
  });

  it('should fetch and return availabilities with 200', async () => {
    (queriesModule.getGroupById as jest.Mock).mockResolvedValue({
      id: mockGroupId,
      name: 'Test Group',
    });

    (queriesModule.getUserGroupRole as jest.Mock).mockResolvedValue('member');

    const mockAvailabilities = [
      {
        id: 'avail-1',
        user_id: mockUserId,
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

    (serviceModule.getGroupAvailabilities as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Availabilities retrieved successfully',
      data: mockAvailabilities,
    });

    const mockRequest = {
      headers: new Map([['x-user-id', mockUserId]]),
      nextUrl: new URL(
        'http://localhost/api/groups/123/availabilities?startDate=2026-03-01T00:00:00Z&endDate=2026-03-31T23:59:59Z'
      ),
    } as unknown as NextRequest;

    const response = await GET(mockRequest, {
      params: Promise.resolve({ groupId: mockGroupId }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockAvailabilities);
    expect(json.count).toBe(1);
  });
});
