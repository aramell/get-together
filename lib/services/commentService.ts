'use server';

import { getGroupCommentsWithFilters, isGroupMember } from '@/lib/db/queries';

interface GetGroupCommentsOptions {
  content_type?: 'all' | 'event' | 'wishlist';
  author_id?: string | null;
  search_query?: string | null;
  sort_by?: 'newest' | 'oldest' | 'author';
  limit?: number;
  offset?: number;
}

interface CommentViewResponse {
  success: boolean;
  message?: string;
  data?: {
    comments: Array<{
      id: string;
      created_by: string;
      content: string;
      created_at: string;
      display_name: string | null;
      avatar_url: string | null;
      target_id: string;
      target_type: 'event' | 'wishlist';
      target_name: string;
    }>;
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
    filters: {
      content_type: string;
      author_id: string | null;
      search_query: string | null;
      sort_by: string;
    };
  };
  errorCode?: string;
}

/**
 * Get all comments from a group with advanced filtering, search, and pagination
 * Supports filtering by content type (event/wishlist), author, full-text search
 * Supports sorting (newest, oldest, author) and pagination
 *
 * @param groupId - Group ID
 * @param userId - Requesting user ID (for authorization)
 * @param options - Filter, search, sort, and pagination options
 * @returns Comments with metadata and pagination info
 * @throws Error if user is not a group member or group doesn't exist
 */
export async function getGroupCommentsService(
  groupId: string,
  userId: string,
  options: GetGroupCommentsOptions = {}
): Promise<CommentViewResponse> {
  try {
    // Authorization: verify user is a group member
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      return {
        success: false,
        message: 'Not a member of this group',
        errorCode: 'FORBIDDEN',
      };
    }

    // Get comments with filters
    const {
      content_type = 'all',
      author_id = null,
      search_query = null,
      sort_by = 'newest',
      limit = 20,
      offset = 0,
    } = options;

    // Validate limit and offset
    if (limit < 1 || limit > 100) {
      return {
        success: false,
        message: 'Invalid limit (must be 1-100)',
        errorCode: 'BAD_REQUEST',
      };
    }

    if (offset < 0) {
      return {
        success: false,
        message: 'Invalid offset (must be >= 0)',
        errorCode: 'BAD_REQUEST',
      };
    }

    // Validate filter values
    if (!['all', 'event', 'wishlist'].includes(content_type)) {
      return {
        success: false,
        message: 'Invalid content_type (must be all, event, or wishlist)',
        errorCode: 'BAD_REQUEST',
      };
    }

    if (!['newest', 'oldest', 'author'].includes(sort_by)) {
      return {
        success: false,
        message: 'Invalid sort_by (must be newest, oldest, or author)',
        errorCode: 'BAD_REQUEST',
      };
    }

    // Get comments from database
    const result = await getGroupCommentsWithFilters(groupId, {
      content_type: content_type as 'all' | 'event' | 'wishlist',
      author_id,
      search_query,
      sort_by: sort_by as 'newest' | 'oldest' | 'author',
      limit,
      offset,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(result.totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      success: true,
      data: {
        comments: result.comments,
        totalCount: result.totalCount,
        page: currentPage,
        pageSize: limit,
        totalPages,
        filters: {
          content_type,
          author_id: author_id || null,
          search_query: search_query || null,
          sort_by,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch comments';
    console.error('Error in getGroupCommentsService:', error);

    return {
      success: false,
      message,
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
