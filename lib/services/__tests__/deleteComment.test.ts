import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { deleteEventComment, deleteWishlistCommentService } from '../commentService';
import * as queriesModule from '@/lib/db/queries';

// Mock the database queries
jest.mock('@/lib/db/queries');

describe('Comment Delete Service', () => {
  let mockGetUserGroupRole: jest.MockedFunction<typeof queriesModule.getUserGroupRole>;
  let mockGetEventCommentById: jest.MockedFunction<typeof queriesModule.getEventCommentById>;
  let mockGetWishlistCommentById: jest.MockedFunction<typeof queriesModule.getWishlistCommentById>;
  let mockDeleteEventCommentQuery: jest.MockedFunction<typeof queriesModule.deleteEventComment>;
  let mockDeleteWishlistCommentQuery: jest.MockedFunction<typeof queriesModule.deleteWishlistComment>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserGroupRole = queriesModule.getUserGroupRole as jest.MockedFunction<typeof queriesModule.getUserGroupRole>;
    mockGetEventCommentById = queriesModule.getEventCommentById as jest.MockedFunction<typeof queriesModule.getEventCommentById>;
    mockGetWishlistCommentById = queriesModule.getWishlistCommentById as jest.MockedFunction<typeof queriesModule.getWishlistCommentById>;
    mockDeleteEventCommentQuery = queriesModule.deleteEventComment as jest.MockedFunction<typeof queriesModule.deleteEventComment>;
    mockDeleteWishlistCommentQuery = queriesModule.deleteWishlistComment as jest.MockedFunction<typeof queriesModule.deleteWishlistComment>;
  });

  describe('deleteEventComment', () => {
    describe('Authorization', () => {
      it('should return FORBIDDEN if user is not a group member', async () => {
        mockGetUserGroupRole.mockResolvedValue(null);

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('FORBIDDEN');
        expect(result.message).toContain('Not a member');
      });

      it('should return FORBIDDEN if user is not the author and not admin', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetEventCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-2',
          created_at: '2026-03-20T10:00:00Z',
        });

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('FORBIDDEN');
        expect(result.message).toContain('permission');
      });

      it('should allow deletion by comment author', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetEventCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-1',
          created_at: '2026-03-20T10:00:00Z',
        });
        mockDeleteEventCommentQuery.mockResolvedValue(undefined);

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(true);
      });

      it('should allow deletion by group admin', async () => {
        mockGetUserGroupRole.mockResolvedValue('admin');
        mockGetEventCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-2',
          created_at: '2026-03-20T10:00:00Z',
        });
        mockDeleteEventCommentQuery.mockResolvedValue(undefined);

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(true);
      });
    });

    describe('Comment Existence', () => {
      it('should return NOT_FOUND if comment does not exist', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetEventCommentById.mockResolvedValue(null);

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NOT_FOUND');
      });

      it('should return CONFLICT if comment is already deleted', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetEventCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-1',
          created_at: '2026-03-20T10:00:00Z',
          deleted_at: '2026-03-20T11:00:00Z',
        });

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('CONFLICT');
        expect(result.message).toContain('already been deleted');
      });
    });

    describe('Successful Deletion', () => {
      it('should successfully delete event comment', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetEventCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-1',
          created_at: '2026-03-20T10:00:00Z',
        });
        mockDeleteEventCommentQuery.mockResolvedValue(undefined);

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(true);
        expect(result.message).toBe('Comment deleted successfully');
        expect(mockDeleteEventCommentQuery).toHaveBeenCalledWith('comment-1');
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockGetUserGroupRole.mockRejectedValue(new Error('Database connection failed'));

        const result = await deleteEventComment('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('INTERNAL_ERROR');
        expect(result.message).toContain('Database connection');
      });
    });
  });

  describe('deleteWishlistCommentService', () => {
    describe('Authorization', () => {
      it('should return FORBIDDEN if user is not a group member', async () => {
        mockGetUserGroupRole.mockResolvedValue(null);

        const result = await deleteWishlistCommentService('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('FORBIDDEN');
      });

      it('should allow deletion by comment author', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetWishlistCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-1',
          created_at: '2026-03-20T10:00:00Z',
        });
        mockDeleteWishlistCommentQuery.mockResolvedValue(undefined);

        const result = await deleteWishlistCommentService('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(true);
      });

      it('should allow deletion by group admin', async () => {
        mockGetUserGroupRole.mockResolvedValue('admin');
        mockGetWishlistCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-2',
          created_at: '2026-03-20T10:00:00Z',
        });
        mockDeleteWishlistCommentQuery.mockResolvedValue(undefined);

        const result = await deleteWishlistCommentService('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(true);
      });
    });

    describe('Comment Existence', () => {
      it('should return NOT_FOUND if comment does not exist', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetWishlistCommentById.mockResolvedValue(null);

        const result = await deleteWishlistCommentService('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('NOT_FOUND');
      });

      it('should return CONFLICT if comment is already deleted', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetWishlistCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-1',
          created_at: '2026-03-20T10:00:00Z',
          deleted_at: '2026-03-20T11:00:00Z',
        });

        const result = await deleteWishlistCommentService('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('CONFLICT');
      });
    });

    describe('Successful Deletion', () => {
      it('should successfully delete wishlist comment', async () => {
        mockGetUserGroupRole.mockResolvedValue('member');
        mockGetWishlistCommentById.mockResolvedValue({
          id: 'comment-1',
          content: 'Test comment',
          created_by: 'user-1',
          created_at: '2026-03-20T10:00:00Z',
        });
        mockDeleteWishlistCommentQuery.mockResolvedValue(undefined);

        const result = await deleteWishlistCommentService('group-1', 'comment-1', 'user-1');

        expect(result.success).toBe(true);
        expect(mockDeleteWishlistCommentQuery).toHaveBeenCalledWith('comment-1');
      });
    });
  });
});
