import { POST as postInterest, DELETE as deleteInterest } from '@/app/api/groups/[groupId]/wishlist/[itemId]/interest/route';
import { NextRequest } from 'next/server';
import * as authLib from '@/lib/api/auth';
import * as wishlistService from '@/lib/services/wishlistService';

jest.mock('@/lib/api/auth');
jest.mock('@/lib/services/wishlistService');

describe('POST /api/groups/[groupId]/wishlist/[itemId]/interest', () => {
  const mockGroupId = 'group-123';
  const mockItemId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mark interest on a wishlist item successfully', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.markInterestService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Interest marked',
      data: { interest_count: 5 },
    });

    const response = await postInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(200);
    expect(wishlistService.markInterestService).toHaveBeenCalledWith(
      mockItemId,
      mockUserId
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await postInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not a group member', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.markInterestService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'You must be a group member to mark interest',
      error: 'USER_NOT_MEMBER',
      errorCode: 'FORBIDDEN',
    });

    const response = await postInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(403);
  });

  it('should return 404 if wishlist item not found', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.markInterestService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Wishlist item not found',
      error: 'ITEM_NOT_FOUND',
      errorCode: 'NOT_FOUND',
    });

    const response = await postInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(404);
  });

  it('should return 409 Conflict if user already marked interest', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.markInterestService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'You have already marked interest on this item',
      error: 'ALREADY_INTERESTED',
      errorCode: 'CONFLICT',
    });

    const response = await postInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(409);
  });

  it('should return 500 on unexpected internal error', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.markInterestService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to mark interest',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    });

    const response = await postInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(500);
  });
});

describe('DELETE /api/groups/[groupId]/wishlist/[itemId]/interest', () => {
  const mockGroupId = 'group-123';
  const mockItemId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should unmark interest on a wishlist item successfully', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.unmarkInterestService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Interest unmarked',
      data: { interest_count: 4 },
    });

    const response = await deleteInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(200);
    expect(wishlistService.unmarkInterestService).toHaveBeenCalledWith(
      mockItemId,
      mockUserId
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await deleteInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(401);
  });

  it('should return 403 Forbidden if user is not a group member', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.unmarkInterestService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'You must be a group member to unmark interest',
      error: 'USER_NOT_MEMBER',
      errorCode: 'FORBIDDEN',
    });

    const response = await deleteInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(403);
  });

  it('should return 404 if wishlist item not found', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.unmarkInterestService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Wishlist item not found',
      error: 'ITEM_NOT_FOUND',
      errorCode: 'NOT_FOUND',
    });

    const response = await deleteInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(404);
  });

  it('should return 500 on unexpected internal error', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.unmarkInterestService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Failed to unmark interest',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    });

    const response = await deleteInterest(mockRequest, {
      params: { groupId: mockGroupId, itemId: mockItemId },
    });

    expect(response.status).toBe(500);
  });
});

describe('Interest Count in List Response', () => {
  const mockGroupId = 'group-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include interest_count and user_is_interested in wishlist items response', async () => {
    const mockRequest = {
      url: 'http://localhost:3000/api/groups/group-123/wishlist',
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.getWishlistItemsService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Wishlist items retrieved',
      data: {
        items: [
          {
            id: 'item-1',
            group_id: mockGroupId,
            created_by: 'user-123',
            title: 'Concert Tickets',
            description: 'Summer concert',
            link: 'https://ticketmaster.com',
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
            interest_count: 5,
            user_is_interested: true,
          },
          {
            id: 'item-2',
            group_id: mockGroupId,
            created_by: 'user-789',
            title: 'Board Games',
            description: 'Fun board games',
            link: null,
            created_at: '2026-03-15T10:00:00Z',
            updated_at: '2026-03-15T10:00:00Z',
            interest_count: 3,
            user_is_interested: false,
          },
        ],
        total: 2,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    });

    const { GET } = await import('@/app/api/groups/[groupId]/wishlist/route');
    const response = await GET(mockRequest, {
      params: { groupId: mockGroupId },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.items[0].interest_count).toBe(5);
    expect(body.data.items[0].user_is_interested).toBe(true);
    expect(body.data.items[1].interest_count).toBe(3);
    expect(body.data.items[1].user_is_interested).toBe(false);
  });
});
