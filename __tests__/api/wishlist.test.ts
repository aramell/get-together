import { POST, GET } from '@/app/api/groups/[groupId]/wishlist/route';
import { NextRequest } from 'next/server';
import * as authLib from '@/lib/api/auth';
import * as wishlistService from '@/lib/services/wishlistService';

jest.mock('@/lib/api/auth');
jest.mock('@/lib/services/wishlistService');

describe('POST /api/groups/[groupId]/wishlist', () => {
  const mockGroupId = 'group-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a wishlist item with valid data', async () => {
    const mockRequest = {
      json: async () => ({
        title: 'Concert Tickets',
        description: 'Summer concerts',
        link: 'https://ticketmaster.com',
      }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.createWishlistItemService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Item added to wishlist',
      data: {
        id: 'item-789',
        group_id: mockGroupId,
        created_by: mockUserId,
        title: 'Concert Tickets',
        description: 'Summer concerts',
        link: 'https://ticketmaster.com',
        created_at: '2026-03-16T10:00:00Z',
        updated_at: '2026-03-16T10:00:00Z',
      },
    });

    const response = await POST(mockRequest, {
      params: { groupId: mockGroupId },
    });

    expect(response.status).toBe(201);
    expect(wishlistService.createWishlistItemService).toHaveBeenCalledWith(
      mockGroupId,
      mockUserId,
      {
        title: 'Concert Tickets',
        description: 'Summer concerts',
        link: 'https://ticketmaster.com',
      }
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    const mockRequest = {
      json: async () => ({
        title: 'Concert',
      }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await POST(mockRequest, {
      params: { groupId: mockGroupId },
    });

    expect(response.status).toBe(401);
  });

  it('should return 422 on validation error', async () => {
    const mockRequest = {
      json: async () => ({
        title: '', // Invalid: empty title
        description: 'Some desc',
      }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.createWishlistItemService as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Title is required',
      errorCode: 'VALIDATION_ERROR',
    });

    const response = await POST(mockRequest, {
      params: { groupId: mockGroupId },
    });

    expect(response.status).toBe(422);
  });
});

describe('GET /api/groups/[groupId]/wishlist', () => {
  const mockGroupId = 'group-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch wishlist items', async () => {
    const mockRequest = {
      url: `http://localhost/api/groups/${mockGroupId}/wishlist?limit=20&offset=0`,
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
            created_by: mockUserId,
            title: 'Concert',
            description: null,
            link: null,
            created_at: '2026-03-16T10:00:00Z',
            updated_at: '2026-03-16T10:00:00Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    });

    const response = await GET(mockRequest, {
      params: { groupId: mockGroupId },
    });

    expect(response.status).toBe(200);
  });

  it('should return 401 if user is not authenticated', async () => {
    const mockRequest = {
      url: `http://localhost/api/groups/${mockGroupId}/wishlist`,
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await GET(mockRequest, {
      params: { groupId: mockGroupId },
    });

    expect(response.status).toBe(401);
  });

  it('should handle pagination parameters', async () => {
    const mockRequest = {
      url: `http://localhost/api/groups/${mockGroupId}/wishlist?limit=10&offset=20`,
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (wishlistService.getWishlistItemsService as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Wishlist items retrieved',
      data: {
        items: [],
        total: 50,
        limit: 10,
        offset: 20,
        hasMore: true,
      },
    });

    await GET(mockRequest, { params: { groupId: mockGroupId } });

    expect(wishlistService.getWishlistItemsService).toHaveBeenCalledWith(
      mockGroupId,
      mockUserId,
      10,
      20
    );
  });
});
