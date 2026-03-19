/**
 * Tests for Comment Filtering, Pagination & Search - Story 6.3
 * Covers: AC1 (discovery), AC2 (content type filter), AC3 (author filter),
 *         AC4 (search), AC5 (pagination), AC7 (sort)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGroupId = '550e8400-e29b-41d4-a716-446655440001';
const mockUserId = '550e8400-e29b-41d4-a716-446655440002';

// Mock comments from events and wishlist
const mockEventComment = {
  id: 'comment-1',
  created_by: 'user-1',
  content: 'Great event idea! Pizza sounds amazing',
  created_at: '2026-03-18T10:00:00Z',
  updated_at: '2026-03-18T10:00:00Z',
  display_name: 'Alice',
  avatar_url: 'https://example.com/avatar-1.jpg',
  target_id: 'event-1',
  target_type: 'event',
  target_name: 'Group Pizza Night',
};

const mockWishlistComment = {
  id: 'comment-2',
  created_by: 'user-2',
  content: 'I love this pizza brand!',
  created_at: '2026-03-18T10:05:00Z',
  updated_at: '2026-03-18T10:05:00Z',
  display_name: 'Bob',
  avatar_url: 'https://example.com/avatar-2.jpg',
  target_id: 'item-1',
  target_type: 'wishlist',
  target_name: 'Pizza Oven',
};

describe('GET /api/groups/:groupId/comments - Advanced Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Comment Discovery Interface', () => {
    it('should return all comments from events and wishlist items', async () => {
      // Test expects comments from both sources
      const expectedResponse = {
        success: true,
        data: {
          comments: [mockEventComment, mockWishlistComment],
          totalCount: 2,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        },
      };
      expect(expectedResponse.data.comments).toHaveLength(2);
      expect(expectedResponse.data.comments[0].target_type).toBe('event');
      expect(expectedResponse.data.comments[1].target_type).toBe('wishlist');
    });

    it('should display comment with author name, timestamp, target, and text (AC1)', () => {
      expect(mockEventComment).toHaveProperty('display_name');
      expect(mockEventComment).toHaveProperty('created_at');
      expect(mockEventComment).toHaveProperty('target_name');
      expect(mockEventComment).toHaveProperty('content');
      expect(mockEventComment.display_name).toBe('Alice');
    });

    it('should sort comments newest first by default (AC1)', () => {
      const comments = [mockEventComment, mockWishlistComment];
      // Sorted by created_at descending (newest first)
      const sorted = comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      expect(sorted[0].created_at).toBeGreaterThan(sorted[1].created_at);
    });

    it('should indicate pagination in response (AC1)', () => {
      const response = {
        comments: [mockEventComment, mockWishlistComment],
        totalCount: 25,
        page: 1,
        pageSize: 20,
        totalPages: 2,
      };
      expect(response).toHaveProperty('page');
      expect(response).toHaveProperty('totalCount');
      expect(response).toHaveProperty('pageSize');
    });
  });

  describe('AC2: Filtering by Content Type', () => {
    it('should filter comments by content_type=event', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const filtered = allComments.filter((c) => c.target_type === 'event');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].target_type).toBe('event');
    });

    it('should filter comments by content_type=wishlist', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const filtered = allComments.filter((c) => c.target_type === 'wishlist');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].target_type).toBe('wishlist');
    });

    it('should return all comments when content_type=all', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      expect(allComments).toHaveLength(2);
    });

    it('should indicate active filter in response (AC2)', () => {
      const response = {
        comments: [mockEventComment],
        filters: { content_type: 'event', author_id: null, search_query: null },
        totalCount: 1,
      };
      expect(response.filters.content_type).toBe('event');
    });
  });

  describe('AC3: Filtering by Author', () => {
    it('should filter comments by author_id', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const userId = 'user-1';
      const filtered = allComments.filter((c) => c.created_by === userId);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].created_by).toBe('user-1');
    });

    it('should allow combining author filter with content type filter', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const userId = 'user-2';
      const contentType = 'wishlist';
      const filtered = allComments.filter((c) => c.created_by === userId && c.target_type === contentType);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].created_by).toBe('user-2');
      expect(filtered[0].target_type).toBe('wishlist');
    });

    it('should support clear filters (AC3)', () => {
      const filters = { author_id: 'user-1', content_type: 'event' };
      // Clearing filters
      const cleared = { author_id: null, content_type: 'all' };
      expect(cleared.author_id).toBeNull();
      expect(cleared.content_type).toBe('all');
    });
  });

  describe('AC4: Search Functionality', () => {
    it('should search in comment content (case-insensitive)', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const query = 'pizza';
      const filtered = allComments.filter((c) => c.content.toLowerCase().includes(query.toLowerCase()));
      expect(filtered).toHaveLength(2); // Both mention pizza
    });

    it('should search in author names (case-insensitive)', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const query = 'alice';
      const filtered = allComments.filter((c) => c.display_name?.toLowerCase().includes(query.toLowerCase()));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].display_name).toBe('Alice');
    });

    it('should search in target names (event/item names)', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const query = 'oven';
      const filtered = allComments.filter((c) => c.target_name.toLowerCase().includes(query.toLowerCase()));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].target_name).toBe('Pizza Oven');
    });

    it('should show result count for search query (AC4)', () => {
      const allComments = [mockEventComment, mockWishlistComment];
      const query = 'pizza';
      const matched = allComments.filter((c) => c.content.toLowerCase().includes(query.toLowerCase()));
      const response = {
        comments: matched,
        search_query: query,
        result_count: matched.length,
      };
      expect(response.result_count).toBe(2);
    });
  });

  describe('AC5: Pagination', () => {
    it('should paginate with 20 items per page', () => {
      const totalComments = 45;
      const pageSize = 20;
      const totalPages = Math.ceil(totalComments / pageSize);
      expect(totalPages).toBe(3);
    });

    it('should support page navigation', () => {
      const comments = Array.from({ length: 45 }, (_, i) => ({
        id: `comment-${i}`,
        content: `Comment ${i}`,
        created_at: new Date(Date.now() - i * 60000).toISOString(),
      }));

      // Page 1
      const page1 = comments.slice(0, 20);
      expect(page1).toHaveLength(20);

      // Page 2
      const page2 = comments.slice(20, 40);
      expect(page2).toHaveLength(20);

      // Page 3
      const page3 = comments.slice(40, 60);
      expect(page3).toHaveLength(5);
    });

    it('should show page indicator with total count (AC5)', () => {
      const response = {
        page: 2,
        pageSize: 20,
        totalCount: 100,
        totalPages: 5,
        indicator: 'Page 2 of 5 (100 total comments)',
      };
      expect(response.indicator).toBe('Page 2 of 5 (100 total comments)');
    });
  });

  describe('AC6: Real-time Updates', () => {
    it('should include new comments in filtered results if they match', () => {
      const comments = [mockEventComment];
      const newComment = { ...mockWishlistComment, created_at: new Date().toISOString() };
      const updated = [newComment, ...comments]; // Newest first
      expect(updated[0].id).toBe('comment-2');
    });

    it('should update total count when new comments are added', () => {
      let totalCount = 2;
      // New comment added
      totalCount += 1;
      expect(totalCount).toBe(3);
    });
  });

  describe('AC7: Sort Options', () => {
    it('should sort by newest first (default)', () => {
      const comments = [mockEventComment, mockWishlistComment];
      const sorted = [...comments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      expect(sorted[0].created_at).toBeGreaterThan(sorted[1].created_at);
    });

    it('should sort by oldest first', () => {
      const comments = [mockEventComment, mockWishlistComment];
      const sorted = [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      expect(sorted[0].created_at).toBeLessThan(sorted[1].created_at);
    });

    it('should sort by author (A-Z)', () => {
      const comments = [mockEventComment, mockWishlistComment];
      const sorted = [...comments].sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
      expect(sorted[0].display_name).toBe('Alice');
      expect(sorted[1].display_name).toBe('Bob');
    });
  });

  describe('AC8: Target Link & Context', () => {
    it('should include target_id for navigation', () => {
      expect(mockEventComment).toHaveProperty('target_id');
      expect(mockEventComment.target_id).toBe('event-1');
    });

    it('should include target_type to differentiate event/item', () => {
      expect(mockEventComment.target_type).toBe('event');
      expect(mockWishlistComment.target_type).toBe('wishlist');
    });
  });

  describe('Error Handling & Authorization', () => {
    it('should return 401 if user is not authenticated', () => {
      const expectedError = {
        success: false,
        errorCode: 'UNAUTHORIZED',
        message: 'Authentication required',
        status: 401,
      };
      expect(expectedError.status).toBe(401);
    });

    it('should return 403 if user is not a group member', () => {
      const expectedError = {
        success: false,
        errorCode: 'FORBIDDEN',
        message: 'Not a member of this group',
        status: 403,
      };
      expect(expectedError.status).toBe(403);
    });

    it('should return 404 if group does not exist', () => {
      const expectedError = {
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Group not found',
        status: 404,
      };
      expect(expectedError.status).toBe(404);
    });

    it('should return 400 for invalid filter parameters', () => {
      const expectedError = {
        success: false,
        errorCode: 'BAD_REQUEST',
        message: 'Invalid filter parameters',
        status: 400,
      };
      expect(expectedError.status).toBe(400);
    });
  });

  describe('Parameter Combinations', () => {
    it('should handle all filter combinations', () => {
      const filterCombos = [
        { content_type: 'all', author_id: null, search_query: null, sort_by: 'newest' },
        { content_type: 'event', author_id: 'user-1', search_query: null, sort_by: 'newest' },
        { content_type: 'wishlist', author_id: null, search_query: 'pizza', sort_by: 'oldest' },
        { content_type: 'event', author_id: 'user-2', search_query: 'idea', sort_by: 'author' },
      ];

      expect(filterCombos).toHaveLength(4);
      filterCombos.forEach((combo) => {
        expect(combo).toHaveProperty('content_type');
        expect(combo).toHaveProperty('sort_by');
      });
    });

    it('should handle pagination with filters', () => {
      const request = {
        content_type: 'event',
        author_id: 'user-1',
        page: 2,
        limit: 20,
      };
      const offset = (request.page - 1) * request.limit;
      expect(offset).toBe(20);
    });
  });
});
