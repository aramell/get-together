import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DELETE } from '../route';
import { NextRequest } from 'next/server';
import * as jwtModule from '@/lib/auth/jwt';
import * as commentServiceModule from '@/lib/services/commentService';

// Mock the JWT module
jest.mock('@/lib/auth/jwt');
// Mock the comment service
jest.mock('@/lib/services/commentService');

describe('DELETE /api/groups/:groupId/wishlist/:itemId/comments/:commentId', () => {
  let mockGetSubFromJWT: jest.MockedFunction<typeof jwtModule.getSubFromJWT>;
  let mockDeleteWishlistComment: jest.MockedFunction<typeof commentServiceModule.deleteWishlistCommentService>;
  let mockRequest: Partial<NextRequest>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSubFromJWT = jwtModule.getSubFromJWT as jest.MockedFunction<typeof jwtModule.getSubFromJWT>;
    mockDeleteWishlistComment = commentServiceModule.deleteWishlistCommentService as jest.MockedFunction<typeof commentServiceModule.deleteWishlistCommentService>;

    mockRequest = {
      json: jest.fn(),
    };
  });

  describe('Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetSubFromJWT.mockReturnValue(null);

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' },
      });

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.errorCode).toBe('UNAUTHORIZED');
    });

    it('should return 403 if user is not a group member', async () => {
      mockGetSubFromJWT.mockReturnValue('user-1');
      mockDeleteWishlistComment.mockResolvedValue({
        success: false,
        message: 'Not a member of this group',
        errorCode: 'FORBIDDEN',
      });

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' },
      });

      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.errorCode).toBe('FORBIDDEN');
    });

    it('should return 403 if user is not the comment author and not admin', async () => {
      mockGetSubFromJWT.mockReturnValue('user-2');
      mockDeleteWishlistComment.mockResolvedValue({
        success: false,
        message: 'You do not have permission to delete this comment',
        errorCode: 'FORBIDDEN',
      });

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' },
      });

      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('Successful Deletion', () => {
    it('should successfully delete a comment by author', async () => {
      mockGetSubFromJWT.mockReturnValue('user-1');
      mockDeleteWishlistComment.mockResolvedValue({
        success: true,
        message: 'Comment deleted successfully',
      });

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' },
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockDeleteWishlistComment).toHaveBeenCalledWith('group-1', 'comment-1', 'user-1');
    });

    it('should successfully delete a comment by group admin', async () => {
      mockGetSubFromJWT.mockReturnValue('admin-user');
      mockDeleteWishlistComment.mockResolvedValue({
        success: true,
        message: 'Comment deleted successfully',
      });

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' },
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 if comment not found', async () => {
      mockGetSubFromJWT.mockReturnValue('user-1');
      mockDeleteWishlistComment.mockResolvedValue({
        success: false,
        message: 'Comment not found',
        errorCode: 'NOT_FOUND',
      });

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'nonexistent' },
      });

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.errorCode).toBe('NOT_FOUND');
    });

    it('should return 409 if comment already deleted', async () => {
      mockGetSubFromJWT.mockReturnValue('user-1');
      mockDeleteWishlistComment.mockResolvedValue({
        success: false,
        message: 'Comment has already been deleted',
        errorCode: 'CONFLICT',
      });

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' },
      });

      const data = await response.json();
      expect(response.status).toBe(409);
      expect(data.errorCode).toBe('CONFLICT');
    });

    it('should return 500 on server error', async () => {
      mockGetSubFromJWT.mockReturnValue('user-1');
      mockDeleteWishlistComment.mockRejectedValue(new Error('Database connection failed'));

      const response = await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'group-1', itemId: 'item-1', commentId: 'comment-1' },
      });

      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.errorCode).toBe('INTERNAL_ERROR');
    });
  });

  describe('Request Parameter Handling', () => {
    it('should extract groupId, itemId, and commentId from params', async () => {
      mockGetSubFromJWT.mockReturnValue('user-1');
      mockDeleteWishlistComment.mockResolvedValue({
        success: true,
        message: 'Comment deleted successfully',
      });

      await DELETE(mockRequest as NextRequest, {
        params: { groupId: 'test-group', itemId: 'test-item', commentId: 'test-comment' },
      });

      expect(mockDeleteWishlistComment).toHaveBeenCalledWith('test-group', 'test-comment', 'user-1');
    });
  });
});
