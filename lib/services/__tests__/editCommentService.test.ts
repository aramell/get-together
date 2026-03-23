/**
 * Tests for editCommentService functions - Story 6.4 Task 1.3
 * Covers: AC4 (backend processing), AC7 (concurrent edit handling)
 */

import { editEventComment, editWishlistComment } from '../commentService';
import * as queries from '@/lib/db/queries';

jest.mock('@/lib/db/queries');

const mockQueries = queries as jest.Mocked<typeof queries>;

describe('editCommentService - Event Comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization & Permission Checks', () => {
    it('should allow comment author to edit their own comment', async () => {
      const commentId = 'comment-1';
      const groupId = 'group-1';
      const userId = 'user-1'; // comment author
      const newContent = 'Updated comment content';

      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getEventCommentById.mockResolvedValue({
        id: commentId,
        event_id: 'event-1',
        group_id: groupId,
        created_by: userId, // Same user - author
        content: 'Original content',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });
      mockQueries.updateEventComment.mockResolvedValue({
        id: commentId,
        content: newContent,
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editEventComment(groupId, commentId, userId, newContent);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(newContent);
      expect(result.data?.updated_count).toBe(1);
      expect(mockQueries.updateEventComment).toHaveBeenCalledWith(commentId, newContent);
    });

    it('should allow group admin to edit any comment', async () => {
      const commentId = 'comment-1';
      const groupId = 'group-1';
      const adminId = 'admin-1';
      const originalAuthor = 'user-1';

      mockQueries.getUserGroupRole.mockResolvedValue('admin');
      mockQueries.getEventCommentById.mockResolvedValue({
        id: commentId,
        event_id: 'event-1',
        group_id: groupId,
        created_by: originalAuthor,
        content: 'Original content',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });
      mockQueries.updateEventComment.mockResolvedValue({
        id: commentId,
        content: 'Admin edited content',
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editEventComment(groupId, commentId, adminId, 'Admin edited content');

      expect(result.success).toBe(true);
      expect(mockQueries.updateEventComment).toHaveBeenCalled();
    });

    it('should deny member from editing others comments', async () => {
      const commentId = 'comment-1';
      const groupId = 'group-1';
      const userId = 'user-2'; // Different user
      const originalAuthor = 'user-1';

      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getEventCommentById.mockResolvedValue({
        id: commentId,
        event_id: 'event-1',
        group_id: groupId,
        created_by: originalAuthor,
        content: 'Original content',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });

      const result = await editEventComment(groupId, commentId, userId, 'Hacked content');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(mockQueries.updateEventComment).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not a group member', async () => {
      const commentId = 'comment-1';
      const groupId = 'group-1';
      const userId = 'outsider-1';

      mockQueries.getUserGroupRole.mockResolvedValue(null); // Not a member

      const result = await editEventComment(groupId, commentId, userId, 'Hacked');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
      expect(result.message).toContain('Not a member');
    });

    it('should return 404 when comment not found', async () => {
      const commentId = 'nonexistent';
      const groupId = 'group-1';
      const userId = 'user-1';

      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getEventCommentById.mockResolvedValue(null);

      const result = await editEventComment(groupId, commentId, userId, 'Some content');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('Content Validation', () => {
    const setup = () => {
      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getEventCommentById.mockResolvedValue({
        id: 'comment-1',
        event_id: 'event-1',
        group_id: 'group-1',
        created_by: 'user-1',
        content: 'Original',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });
    };

    it('should reject empty content', async () => {
      setup();

      const result = await editEventComment('group-1', 'comment-1', 'user-1', '');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(mockQueries.updateEventComment).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only content', async () => {
      setup();

      const result = await editEventComment('group-1', 'comment-1', 'user-1', '   \n\t  ');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should reject content exceeding 2000 characters', async () => {
      setup();
      const longContent = 'a'.repeat(2001);

      const result = await editEventComment('group-1', 'comment-1', 'user-1', longContent);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
      expect(result.message).toContain('2000');
    });

    it('should accept valid content at 2000 char limit', async () => {
      setup();
      const validContent = 'a'.repeat(2000);
      mockQueries.updateEventComment.mockResolvedValue({
        id: 'comment-1',
        content: validContent,
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editEventComment('group-1', 'comment-1', 'user-1', validContent);

      expect(result.success).toBe(true);
      expect(mockQueries.updateEventComment).toHaveBeenCalled();
    });

    it('should accept content with 1 character', async () => {
      setup();
      mockQueries.updateEventComment.mockResolvedValue({
        id: 'comment-1',
        content: 'a',
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editEventComment('group-1', 'comment-1', 'user-1', 'a');

      expect(result.success).toBe(true);
    });
  });

  describe('Database Updates', () => {
    beforeEach(() => {
      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getEventCommentById.mockResolvedValue({
        id: 'comment-1',
        event_id: 'event-1',
        group_id: 'group-1',
        created_by: 'user-1',
        content: 'Original',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });
    });

    it('should set edited_at timestamp on first edit', async () => {
      mockQueries.updateEventComment.mockResolvedValue({
        id: 'comment-1',
        content: 'Updated',
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editEventComment('group-1', 'comment-1', 'user-1', 'Updated');

      expect(result.success).toBe(true);
      expect(result.data?.edited_at).toBeTruthy();
      expect(result.data?.updated_count).toBe(1);
    });

    it('should increment updated_count on each edit', async () => {
      mockQueries.getEventCommentById.mockResolvedValue({
        id: 'comment-1',
        event_id: 'event-1',
        group_id: 'group-1',
        created_by: 'user-1',
        content: 'Already edited once',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:30:00Z',
        edited_at: '2026-03-20T10:30:00Z',
        updated_count: 1,
        deleted_at: null,
      });

      mockQueries.updateEventComment.mockResolvedValue({
        id: 'comment-1',
        content: 'Edited again',
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 2,
      });

      const result = await editEventComment('group-1', 'comment-1', 'user-1', 'Edited again');

      expect(result.success).toBe(true);
      expect(result.data?.updated_count).toBe(2);
    });

    it('should preserve created_at timestamp', async () => {
      const originalCreatedAt = '2026-03-20T10:00:00Z';
      mockQueries.getEventCommentById.mockResolvedValue({
        id: 'comment-1',
        event_id: 'event-1',
        group_id: 'group-1',
        created_by: 'user-1',
        content: 'Original',
        created_at: originalCreatedAt,
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });

      mockQueries.updateEventComment.mockResolvedValue({
        id: 'comment-1',
        content: 'Updated',
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editEventComment('group-1', 'comment-1', 'user-1', 'Updated');

      // Verify that updateEventComment was called, and original created_at wasn't modified
      expect(result.success).toBe(true);
      expect(mockQueries.updateEventComment).toHaveBeenCalledWith('comment-1', 'Updated');
    });
  });

  describe('Concurrent Edit Handling', () => {
    it('should detect concurrent edits using edited_at timestamp', async () => {
      const commentId = 'comment-1';
      const groupId = 'group-1';
      const userId = 'user-1';

      mockQueries.getUserGroupRole.mockResolvedValue('member');

      // Simulate comment authored by user-1 but was just edited (by another user)
      mockQueries.getEventCommentById.mockResolvedValue({
        id: commentId,
        event_id: 'event-1',
        group_id: groupId,
        created_by: userId, // Same user - author
        content: 'Content just edited by another session',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:30:00Z',
        edited_at: '2026-03-20T10:30:00Z', // Recently edited by another session
        updated_count: 1,
        deleted_at: null,
      });

      // updateEventComment returns null when there's a version/timestamp conflict
      mockQueries.updateEventComment.mockResolvedValue(null);

      const result = await editEventComment(groupId, commentId, userId, 'My concurrent edit');

      // Should return conflict error
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFLICT');
      expect(result.message).toContain('edited by another user');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getEventCommentById.mockRejectedValue(new Error('Database connection failed'));

      const result = await editEventComment('group-1', 'comment-1', 'user-1', 'Updated');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });
  });
});

describe('editCommentService - Wishlist Comments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authorization', () => {
    it('should allow comment author to edit wishlist comment', async () => {
      const commentId = 'wcomment-1';
      const groupId = 'group-1';
      const userId = 'user-1';

      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getWishlistCommentById.mockResolvedValue({
        id: commentId,
        wishlist_item_id: 'item-1',
        group_id: groupId,
        created_by: userId,
        content: 'Original',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });
      mockQueries.updateWishlistComment.mockResolvedValue({
        id: commentId,
        content: 'Updated',
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editWishlistComment(groupId, commentId, userId, 'Updated');

      expect(result.success).toBe(true);
      expect(mockQueries.updateWishlistComment).toHaveBeenCalled();
    });

    it('should deny edit when user is not a member', async () => {
      mockQueries.getUserGroupRole.mockResolvedValue(null);

      const result = await editWishlistComment('group-1', 'wcomment-1', 'user-1', 'Content');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('Content Validation', () => {
    beforeEach(() => {
      mockQueries.getUserGroupRole.mockResolvedValue('member');
      mockQueries.getWishlistCommentById.mockResolvedValue({
        id: 'wcomment-1',
        wishlist_item_id: 'item-1',
        group_id: 'group-1',
        created_by: 'user-1',
        content: 'Original',
        created_at: '2026-03-20T10:00:00Z',
        updated_at: '2026-03-20T10:00:00Z',
        edited_at: null,
        updated_count: 0,
        deleted_at: null,
      });
    });

    it('should reject empty wishlist comment content', async () => {
      const result = await editWishlistComment('group-1', 'wcomment-1', 'user-1', '');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('VALIDATION_ERROR');
    });

    it('should accept valid wishlist comment content', async () => {
      mockQueries.updateWishlistComment.mockResolvedValue({
        id: 'wcomment-1',
        content: 'Valid content',
        edited_at: '2026-03-20T11:00:00Z',
        updated_count: 1,
      });

      const result = await editWishlistComment('group-1', 'wcomment-1', 'user-1', 'Valid content');

      expect(result.success).toBe(true);
      expect(mockQueries.updateWishlistComment).toHaveBeenCalled();
    });
  });
});
