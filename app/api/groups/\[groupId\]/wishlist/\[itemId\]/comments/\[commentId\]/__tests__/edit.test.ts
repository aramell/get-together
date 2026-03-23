/**
 * Tests for PUT /api/groups/:groupId/wishlist/:itemId/comments/:commentId
 * Story 6.4 Task 1.2 - Wishlist Comment Edit Endpoint
 * Covers: AC3 (submission), AC4 (backend processing), AC10 (parallel endpoints)
 */

import { PUT } from '../route';
import { editWishlistComment } from '@/lib/services/commentService';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/commentService');

const mockEditWishlistComment = editWishlistComment as jest.MockedFunction<
  typeof editWishlistComment
>;

describe('PUT /api/groups/:groupId/wishlist/:itemId/comments/:commentId', () => {
  const baseUrl = 'http://localhost:3000/api/groups/group-1/wishlist/item-1/comments/comment-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should successfully edit a wishlist comment', async () => {
      mockEditWishlistComment.mockResolvedValue({
        success: true,
        data: {
          id: 'comment-1',
          content: 'Updated wishlist comment',
          edited_at: '2026-03-20T11:00:00Z',
          updated_count: 1,
        },
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated wishlist comment' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            itemId: 'item-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('Updated wishlist comment');
    });
  });

  describe('Validation Errors', () => {
    it('should return 422 when content is empty', async () => {
      mockEditWishlistComment.mockResolvedValue({
        success: false,
        message: 'Comment content cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: '' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            itemId: 'item-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(422);
    });

    it('should return 422 when content exceeds 2000 characters', async () => {
      mockEditWishlistComment.mockResolvedValue({
        success: false,
        message: 'Comment content exceeds 2000 character limit',
        errorCode: 'VALIDATION_ERROR',
      });

      const longContent = 'a'.repeat(2001);
      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: longContent }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            itemId: 'item-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(422);
    });
  });

  describe('Authorization Errors', () => {
    it('should return 403 when user is not comment author or admin', async () => {
      mockEditWishlistComment.mockResolvedValue({
        success: false,
        message: 'You do not have permission to edit this comment',
        errorCode: 'FORBIDDEN',
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: 'Hacked' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            itemId: 'item-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 when wishlist comment does not exist', async () => {
      mockEditWishlistComment.mockResolvedValue({
        success: false,
        message: 'Comment not found',
        errorCode: 'NOT_FOUND',
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            itemId: 'item-1',
            commentId: 'nonexistent',
          },
        } as any
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Response Format', () => {
    it('should return proper JSON structure', async () => {
      mockEditWishlistComment.mockResolvedValue({
        success: true,
        data: {
          id: 'comment-1',
          content: 'Updated',
          edited_at: '2026-03-20T11:00:00Z',
          updated_count: 1,
        },
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            itemId: 'item-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.headers.get('content-type')).toContain('application/json');
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });
  });
});
