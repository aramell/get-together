import {
  createWishlistItemService,
  getWishlistItemsService,
  getWishlistItemService,
  deleteWishlistItemService,
} from '@/lib/services/wishlistService';
import * as db from '@/lib/db/queries';
import { ZodError } from 'zod';

// Mock database queries
jest.mock('@/lib/db/queries', () => ({
  getUserGroupRole: jest.fn(),
  createWishlistItem: jest.fn(),
  getWishlistItems: jest.fn(),
  getWishlistItemCount: jest.fn(),
  getWishlistItemById: jest.fn(),
  softDeleteWishlistItem: jest.fn(),
}));

describe('wishlistService', () => {
  const mockGroupId = 'group-123';
  const mockUserId = 'user-456';
  const mockItemId = 'item-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createWishlistItemService', () => {
    it('should create a wishlist item with valid data', async () => {
      const mockItem = {
        id: mockItemId,
        group_id: mockGroupId,
        created_by: mockUserId,
        title: 'Concert Tickets',
        description: 'Get tickets for summer concerts',
        link: 'https://ticketmaster.com',
        created_at: '2026-03-16T10:00:00Z',
        updated_at: '2026-03-16T10:00:00Z',
      };

      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      (db.createWishlistItem as jest.Mock).mockResolvedValue(mockItem);

      const result = await createWishlistItemService(mockGroupId, mockUserId, {
        title: 'Concert Tickets',
        description: 'Get tickets for summer concerts',
        link: 'https://ticketmaster.com',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Item added to wishlist');
      expect(result.data?.title).toBe('Concert Tickets');
      expect(db.createWishlistItem).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId,
        'Concert Tickets',
        'Get tickets for summer concerts',
        'https://ticketmaster.com'
      );
    });

    it('should fail with missing title', async () => {
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');

      const result = await createWishlistItemService(mockGroupId, mockUserId, {
        title: '',
        description: 'Some desc',
        link: 'https://example.com',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('required');
    });

    it('should fail with title exceeding max length', async () => {
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');

      const longTitle = 'a'.repeat(300);
      const result = await createWishlistItemService(mockGroupId, mockUserId, {
        title: longTitle,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('255 characters');
    });

    it('should fail with invalid URL format', async () => {
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');

      const result = await createWishlistItemService(mockGroupId, mockUserId, {
        title: 'Concert',
        link: 'not-a-valid-url',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('valid');
    });

    it('should fail if user is not a group member', async () => {
      (db.getUserGroupRole as jest.Mock).mockResolvedValue(null);

      const result = await createWishlistItemService(mockGroupId, mockUserId, {
        title: 'Concert',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('USER_NOT_MEMBER');
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('getWishlistItemsService', () => {
    it('should fetch wishlist items for a group', async () => {
      const mockItems = [
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
      ];

      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      (db.getWishlistItems as jest.Mock).mockResolvedValue(mockItems);
      (db.getWishlistItemCount as jest.Mock).mockResolvedValue(1);

      const result = await getWishlistItemsService(mockGroupId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(1);
      expect(result.data?.total).toBe(1);
      expect(result.data?.hasMore).toBe(false);
    });

    it('should respect pagination parameters', async () => {
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      (db.getWishlistItems as jest.Mock).mockResolvedValue([]);
      (db.getWishlistItemCount as jest.Mock).mockResolvedValue(50);

      await getWishlistItemsService(mockGroupId, mockUserId, 10, 20);

      expect(db.getWishlistItems).toHaveBeenCalledWith(mockGroupId, 10, 20);
    });

    it('should fail if user is not a group member', async () => {
      (db.getUserGroupRole as jest.Mock).mockResolvedValue(null);

      const result = await getWishlistItemsService(mockGroupId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('USER_NOT_MEMBER');
    });
  });

  describe('getWishlistItemService', () => {
    it('should fetch a single item with creator info', async () => {
      const mockItem = {
        id: mockItemId,
        group_id: mockGroupId,
        created_by: mockUserId,
        title: 'Concert',
        description: null,
        link: null,
        created_at: '2026-03-16T10:00:00Z',
        updated_at: '2026-03-16T10:00:00Z',
        creator_name: 'John',
        creator_email: 'john@example.com',
      };

      (db.getWishlistItemById as jest.Mock).mockResolvedValue(mockItem);
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');

      const result = await getWishlistItemService(mockItemId, mockUserId);

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Concert');
      expect(result.data?.creator_name).toBe('John');
    });

    it('should fail if item not found', async () => {
      (db.getWishlistItemById as jest.Mock).mockResolvedValue(null);

      const result = await getWishlistItemService(mockItemId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('deleteWishlistItemService', () => {
    it('should allow creator to delete their item', async () => {
      const mockItem = {
        id: mockItemId,
        group_id: mockGroupId,
        created_by: mockUserId,
        title: 'Concert',
        description: null,
        link: null,
        created_at: '2026-03-16T10:00:00Z',
        updated_at: '2026-03-16T10:00:00Z',
      };

      (db.getWishlistItemById as jest.Mock).mockResolvedValue(mockItem);
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
      (db.softDeleteWishlistItem as jest.Mock).mockResolvedValue(undefined);

      const result = await deleteWishlistItemService(mockItemId, mockUserId);

      expect(result.success).toBe(true);
      expect(db.softDeleteWishlistItem).toHaveBeenCalledWith(mockItemId);
    });

    it('should allow admin to delete any item', async () => {
      const mockItem = {
        id: mockItemId,
        group_id: mockGroupId,
        created_by: 'other-user',
        title: 'Concert',
        description: null,
        link: null,
        created_at: '2026-03-16T10:00:00Z',
        updated_at: '2026-03-16T10:00:00Z',
      };

      (db.getWishlistItemById as jest.Mock).mockResolvedValue(mockItem);
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('admin');
      (db.softDeleteWishlistItem as jest.Mock).mockResolvedValue(undefined);

      const result = await deleteWishlistItemService(mockItemId, mockUserId);

      expect(result.success).toBe(true);
    });

    it('should prevent non-creator member from deleting', async () => {
      const mockItem = {
        id: mockItemId,
        group_id: mockGroupId,
        created_by: 'other-user',
        title: 'Concert',
        description: null,
        link: null,
        created_at: '2026-03-16T10:00:00Z',
        updated_at: '2026-03-16T10:00:00Z',
      };

      (db.getWishlistItemById as jest.Mock).mockResolvedValue(mockItem);
      (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');

      const result = await deleteWishlistItemService(mockItemId, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNAUTHORIZED');
    });
  });
});

describe('wishlistService - Edge Cases', () => {
  const mockGroupId = 'group-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle empty description', async () => {
    const mockItem = {
      id: 'item-1',
      group_id: mockGroupId,
      created_by: mockUserId,
      title: 'Concert',
      description: null,
      link: null,
      created_at: '2026-03-16T10:00:00Z',
      updated_at: '2026-03-16T10:00:00Z',
    };

    (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
    (db.createWishlistItem as jest.Mock).mockResolvedValue(mockItem);

    const result = await createWishlistItemService(mockGroupId, mockUserId, {
      title: 'Concert',
    });

    expect(result.success).toBe(true);
    expect(db.createWishlistItem).toHaveBeenCalledWith(
      mockGroupId,
      mockUserId,
      'Concert',
      null,
      null
    );
  });

  it('should handle max length title', async () => {
    const maxTitle = 'a'.repeat(255);
    const mockItem = {
      id: 'item-1',
      group_id: mockGroupId,
      created_by: mockUserId,
      title: maxTitle,
      description: null,
      link: null,
      created_at: '2026-03-16T10:00:00Z',
      updated_at: '2026-03-16T10:00:00Z',
    };

    (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
    (db.createWishlistItem as jest.Mock).mockResolvedValue(mockItem);

    const result = await createWishlistItemService(mockGroupId, mockUserId, {
      title: maxTitle,
    });

    expect(result.success).toBe(true);
  });

  it('should allow http and https URLs', async () => {
    (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
    (db.createWishlistItem as jest.Mock).mockResolvedValue({
      id: 'item-1',
      group_id: mockGroupId,
      created_by: mockUserId,
      title: 'Link Test',
      description: null,
      link: 'http://example.com',
      created_at: '2026-03-16T10:00:00Z',
      updated_at: '2026-03-16T10:00:00Z',
    });

    const result1 = await createWishlistItemService(mockGroupId, mockUserId, {
      title: 'Test',
      link: 'http://example.com',
    });

    const result2 = await createWishlistItemService(mockGroupId, mockUserId, {
      title: 'Test',
      link: 'https://example.com',
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should respect pagination bounds', async () => {
    (db.getUserGroupRole as jest.Mock).mockResolvedValue('member');
    (db.getWishlistItems as jest.Mock).mockResolvedValue([]);
    (db.getWishlistItemCount as jest.Mock).mockResolvedValue(100);

    // Test min bound
    await getWishlistItemsService(mockGroupId, mockUserId, 0, 0);
    expect(db.getWishlistItems).toHaveBeenCalledWith(mockGroupId, 1, 0);

    // Test max bound
    await getWishlistItemsService(mockGroupId, mockUserId, 500, 0);
    expect(db.getWishlistItems).toHaveBeenCalledWith(mockGroupId, 100, 0);
  });
});
