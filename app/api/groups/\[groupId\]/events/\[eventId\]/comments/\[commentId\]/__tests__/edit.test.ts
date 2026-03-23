/**
 * Tests for PUT /api/groups/:groupId/events/:eventId/comments/:commentId
 * Story 6.4 Task 1.1 - Event Comment Edit Endpoint
 * Covers: AC3 (submission), AC4 (backend processing), AC7 (concurrent edits), AC10 (parallel endpoints)
 */

import { PUT } from '../route';
import { editEventComment } from '@/lib/services/commentService';
import { getEventCommentById } from '@/lib/db/queries';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/commentService');
jest.mock('@/lib/db/queries');

const mockEditEventComment = editEventComment as jest.MockedFunction<typeof editEventComment>;
const mockGetEventCommentById = getEventCommentById as jest.MockedFunction<typeof getEventCommentById>;

describe('PUT /api/groups/:groupId/events/:eventId/comments/:commentId', () => {
  const baseUrl = 'http://localhost:3000/api/groups/group-1/events/event-1/comments/comment-1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock auth - would be extracted from JWT in real implementation
  });

  describe('Happy Path', () => {
    it('should successfully edit a comment with valid content', async () => {
      const requestBody = { content: 'Updated comment' };

      mockEditEventComment.mockResolvedValue({
        success: true,
        data: {
          id: 'comment-1',
          content: 'Updated comment',
          edited_at: '2026-03-20T11:00:00Z',
          updated_count: 1,
        },
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('Updated comment');
      expect(data.data.updated_count).toBe(1);
    });
  });

  describe('Validation Errors', () => {
    it('should return 422 when content is empty', async () => {
      mockEditEventComment.mockResolvedValue({
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
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(422);
    });

    it('should return 422 when content exceeds 2000 characters', async () => {
      mockEditEventComment.mockResolvedValue({
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
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(422);
    });

    it('should return 422 when content is whitespace only', async () => {
      mockEditEventComment.mockResolvedValue({
        success: false,
        message: 'Comment content cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: '   \n\t  ' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(422);
    });

    it('should return 422 when request body is invalid JSON', async () => {
      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: 'invalid json',
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(422);
    });
  });

  describe('Authorization Errors', () => {
    it('should return 403 when user is not comment author or admin', async () => {
      mockEditEventComment.mockResolvedValue({
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
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(403);
    });

    it('should return 403 when user is not a group member', async () => {
      mockEditEventComment.mockResolvedValue({
        success: false,
        message: 'Not a member of this group',
        errorCode: 'FORBIDDEN',
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
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(403);
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 when comment does not exist', async () => {
      mockEditEventComment.mockResolvedValue({
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
            eventId: 'event-1',
            commentId: 'nonexistent',
          },
        } as any
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Concurrent Edit Handling (AC7)', () => {
    it('should return 409 when comment was edited by another user', async () => {
      mockEditEventComment.mockResolvedValue({
        success: false,
        message: 'Comment was edited by another user. Please refresh and try again.',
        errorCode: 'CONFLICT',
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: 'My edit' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.errorCode).toBe('CONFLICT');
    });
  });

  describe('Content Type & Response Format', () => {
    it('should return proper JSON structure on success', async () => {
      mockEditEventComment.mockResolvedValue({
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
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.headers.get('content-type')).toContain('application/json');
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });

    it('should return proper error structure on failure', async () => {
      mockEditEventComment.mockResolvedValue({
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
            eventId: 'event-1',
            commentId: 'nonexistent',
          },
        } as any
      );

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('errorCode');
      expect(data.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should accept content with exactly 2000 characters', async () => {
      const content2000 = 'a'.repeat(2000);
      mockEditEventComment.mockResolvedValue({
        success: true,
        data: {
          id: 'comment-1',
          content: content2000,
          edited_at: '2026-03-20T11:00:00Z',
          updated_count: 1,
        },
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: content2000 }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(200);
    });

    it('should accept content with 1 character', async () => {
      mockEditEventComment.mockResolvedValue({
        success: true,
        data: {
          id: 'comment-1',
          content: 'a',
          edited_at: '2026-03-20T11:00:00Z',
          updated_count: 1,
        },
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: 'a' }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(200);
    });

    it('should handle special characters in content', async () => {
      const specialContent = '🎉 Updated! <script>alert("xss")</script> & special chars';
      mockEditEventComment.mockResolvedValue({
        success: true,
        data: {
          id: 'comment-1',
          content: specialContent,
          edited_at: '2026-03-20T11:00:00Z',
          updated_count: 1,
        },
      });

      const request = new NextRequest(baseUrl, {
        method: 'PUT',
        body: JSON.stringify({ content: specialContent }),
      });

      const response = await PUT(
        request,
        {
          params: {
            groupId: 'group-1',
            eventId: 'event-1',
            commentId: 'comment-1',
          },
        } as any
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.content).toBe(specialContent);
    });
  });
});
