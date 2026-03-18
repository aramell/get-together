import { POST } from '@/app/api/groups/[groupId]/wishlist/[itemId]/convert/route';
import { NextRequest } from 'next/server';
import * as authLib from '@/lib/api/auth';
import * as wishlistService from '@/lib/services/wishlistService';

jest.mock('@/lib/api/auth');
jest.mock('@/lib/services/wishlistService');

describe('POST /api/groups/[groupId]/wishlist/[itemId]/convert', () => {
  const mockGroupId = 'group-456';
  const mockItemId = 'item-123';
  const mockUserId = 'user-789';
  const futureDate = new Date(Date.now() + 86400000).toISOString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any = {}, headers: Record<string, string> = {}) => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: new Headers(headers),
      body: JSON.stringify(body),
    });
    return request;
  };

  it('should return 401 if user not authenticated', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest({ date: futureDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.errorCode).toBe('UNAUTHORIZED');
  });

  it('should return 400 if request body is invalid JSON', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const request = new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      body: 'invalid json',
    });

    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for missing required date field', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const request = createMockRequest({ description: 'test' });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for date in the past', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const request = createMockRequest({ date: pastDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid threshold (negative)', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const request = createMockRequest({ date: futureDate, threshold: -5 });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for description exceeding max length', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const longDescription = 'a'.repeat(2001);
    const request = createMockRequest({ date: futureDate, description: longDescription });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should return 403 if user not authorized', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Only the item creator or group admin can convert this item',
      errorCode: 'FORBIDDEN',
    });

    const request = createMockRequest({ date: futureDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.errorCode).toBe('FORBIDDEN');
  });

  it('should return 404 if item not found', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Wishlist item not found',
      errorCode: 'NOT_FOUND',
    });

    const request = createMockRequest({ date: futureDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.errorCode).toBe('NOT_FOUND');
  });

  it('should return 409 if item already converted', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: false,
      message: 'This item has already been converted to an event',
      errorCode: 'CONFLICT',
    });

    const request = createMockRequest({ date: futureDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.errorCode).toBe('CONFLICT');
  });

  it('should return 201 and event data on successful conversion', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const mockEvent = {
      id: 'event-999',
      group_id: mockGroupId,
      created_by: mockUserId,
      title: 'Concert Night',
      description: 'Summer festival',
      date: futureDate,
      threshold: 3,
      status: 'proposal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Event created from wishlist item',
      data: {
        event: mockEvent,
        itemToEventLink: { itemId: mockItemId, eventId: mockEvent.id },
      },
    });

    const request = createMockRequest({ date: futureDate, threshold: 3 });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.event.id).toBe('event-999');
    expect(data.data.itemToEventLink.itemId).toBe(mockItemId);
  });

  it('should pass correct parameters to service function', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Success',
      data: { event: {}, itemToEventLink: {} },
    });

    const request = createMockRequest({
      date: futureDate,
      description: 'Updated description',
      threshold: 5,
    });

    await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(wishlistService.convertItemToEvent).toHaveBeenCalledWith(
      mockGroupId,
      mockItemId,
      mockUserId,
      {
        date: futureDate,
        description: 'Updated description',
        threshold: 5,
      }
    );
  });

  it('should handle service errors gracefully', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.convertItemToEvent as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const request = createMockRequest({ date: futureDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.errorCode).toBe('INTERNAL_ERROR');
  });

  it('should validate threshold is positive number if provided', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const request = createMockRequest({ date: futureDate, threshold: 0 });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('should accept valid threshold values', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Success',
      data: { event: { threshold: 100 }, itemToEventLink: {} },
    });

    const request = createMockRequest({ date: futureDate, threshold: 100 });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(201);
  });

  it('should accept empty description', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Success',
      data: { event: {}, itemToEventLink: {} },
    });

    const request = createMockRequest({ date: futureDate, description: '' });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    expect(response.status).toBe(201);
  });

  it('should respond with correct error format', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const request = createMockRequest({ date: futureDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    const data = await response.json();
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('errorCode');
  });

  it('should respond with event data in correct format on success', async () => {
    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const mockEvent = {
      id: 'event-999',
      group_id: mockGroupId,
      created_by: mockUserId,
      title: 'Test Event',
      description: 'Test',
      date: futureDate,
      threshold: 5,
      status: 'proposal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    (wishlistService.convertItemToEvent as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Success',
      data: {
        event: mockEvent,
        itemToEventLink: { itemId: mockItemId, eventId: mockEvent.id },
      },
    });

    const request = createMockRequest({ date: futureDate });
    const response = await POST(request, {
      params: Promise.resolve({ groupId: mockGroupId, itemId: mockItemId }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.event).toEqual(mockEvent);
    expect(data.data.itemToEventLink.itemId).toBe(mockItemId);
  });
});
