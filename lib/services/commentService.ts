'use server';

import {
  getGroupCommentsWithFilters,
  isGroupMember,
  getUserGroupRole,
  getEventCommentById,
  getWishlistCommentById,
  updateEventComment,
  updateWishlistComment,
  deleteEventComment,
  deleteWishlistComment,
} from '@/lib/db/queries';

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

/**
 * Edit an event comment (Story 6.4)
 * Only comment author or group admin can edit
 * Validates content (1-2000 chars), updates edited_at and increments updated_count
 *
 * @param groupId - Group ID
 * @param commentId - Comment ID to edit
 * @param userId - User attempting to edit (must be author or admin)
 * @param newContent - New comment content
 * @returns Success response with updated comment, or error response
 */
export async function editEventComment(
  groupId: string,
  commentId: string,
  userId: string,
  newContent: string
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    id: string;
    content: string;
    edited_at: string;
    updated_count: number;
  };
  errorCode?: string;
}> {
  try {
    // Step 1: Check if user is a group member
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'Not a member of this group',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 2: Validate content
    const trimmedContent = newContent.trim();
    if (!trimmedContent) {
      return {
        success: false,
        message: 'Comment content cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (trimmedContent.length > 2000) {
      return {
        success: false,
        message: 'Comment content exceeds 2000 character limit',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Step 3: Check if comment exists and get current state
    const comment = await getEventCommentById(commentId);
    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        errorCode: 'NOT_FOUND',
      };
    }

    // Step 4: Check authorization (author or admin)
    const isAuthor = comment.created_by === userId;
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isAdmin) {
      return {
        success: false,
        message: 'You do not have permission to edit this comment',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 5: Update comment in database
    const updated = await updateEventComment(commentId, trimmedContent);

    if (!updated) {
      return {
        success: false,
        message: 'Comment was edited by another user. Please refresh and try again.',
        errorCode: 'CONFLICT',
      };
    }

    return {
      success: true,
      data: {
        id: updated.id,
        content: updated.content,
        edited_at: updated.edited_at,
        updated_count: updated.updated_count,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to edit comment';
    console.error('Error in editEventComment:', error);

    return {
      success: false,
      message,
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Edit a wishlist comment (Story 6.4)
 * Only comment author or group admin can edit
 * Validates content (1-2000 chars), updates edited_at and increments updated_count
 *
 * @param groupId - Group ID
 * @param commentId - Comment ID to edit
 * @param userId - User attempting to edit (must be author or admin)
 * @param newContent - New comment content
 * @returns Success response with updated comment, or error response
 */
export async function editWishlistComment(
  groupId: string,
  commentId: string,
  userId: string,
  newContent: string
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    id: string;
    content: string;
    edited_at: string;
    updated_count: number;
  };
  errorCode?: string;
}> {
  try {
    // Step 1: Check if user is a group member
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'Not a member of this group',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 2: Validate content
    const trimmedContent = newContent.trim();
    if (!trimmedContent) {
      return {
        success: false,
        message: 'Comment content cannot be empty',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (trimmedContent.length > 2000) {
      return {
        success: false,
        message: 'Comment content exceeds 2000 character limit',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Step 3: Check if comment exists
    const comment = await getWishlistCommentById(commentId);
    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        errorCode: 'NOT_FOUND',
      };
    }

    // Step 4: Check authorization (author or admin)
    const isAuthor = comment.created_by === userId;
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isAdmin) {
      return {
        success: false,
        message: 'You do not have permission to edit this comment',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 5: Update comment in database
    const updated = await updateWishlistComment(commentId, trimmedContent);

    if (!updated) {
      return {
        success: false,
        message: 'Comment was edited by another user. Please refresh and try again.',
        errorCode: 'CONFLICT',
      };
    }

    return {
      success: true,
      data: {
        id: updated.id,
        content: updated.content,
        edited_at: updated.edited_at,
        updated_count: updated.updated_count,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to edit comment';
    console.error('Error in editWishlistComment:', error);

    return {
      success: false,
      message,
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Delete an event comment (Story 6.5)
 * Only comment author or group admin can delete
 * Uses soft delete pattern (sets deleted_at, no hard deletion)
 *
 * @param groupId - Group ID
 * @param commentId - Comment ID to delete
 * @param userId - User attempting to delete (must be author or admin)
 * @returns Success response or error response
 */
export async function deleteEventCommentWithAuth(
  groupId: string,
  commentId: string,
  userId: string
): Promise<{
  success: boolean;
  message?: string;
  errorCode?: string;
}> {
  try {
    // Step 1: Check if user is a group member
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'Not a member of this group',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 2: Check if comment exists
    const comment = await getEventCommentById(commentId);
    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        errorCode: 'NOT_FOUND',
      };
    }

    // Step 3: Check if already deleted
    if (comment.deleted_at) {
      return {
        success: false,
        message: 'Comment has already been deleted',
        errorCode: 'CONFLICT',
      };
    }

    // Step 4: Check authorization (author or admin)
    const isAuthor = comment.created_by === userId;
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isAdmin) {
      return {
        success: false,
        message: 'You do not have permission to delete this comment',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 5: Soft delete comment in database
    await deleteEventComment(commentId);

    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete comment';
    console.error('Error in deleteEventCommentWithAuth:', error);

    return {
      success: false,
      message,
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Delete a wishlist comment (Story 6.5)
 * Only comment author or group admin can delete
 * Uses soft delete pattern (sets deleted_at, no hard deletion)
 *
 * @param groupId - Group ID
 * @param commentId - Comment ID to delete
 * @param userId - User attempting to delete (must be author or admin)
 * @returns Success response or error response
 */
export async function deleteWishlistCommentService(
  groupId: string,
  commentId: string,
  userId: string
): Promise<{
  success: boolean;
  message?: string;
  errorCode?: string;
}> {
  try {
    // Step 1: Check if user is a group member
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'Not a member of this group',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 2: Check if comment exists
    const comment = await getWishlistCommentById(commentId);
    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
        errorCode: 'NOT_FOUND',
      };
    }

    // Step 3: Check if already deleted
    if (comment.deleted_at) {
      return {
        success: false,
        message: 'Comment has already been deleted',
        errorCode: 'CONFLICT',
      };
    }

    // Step 4: Check authorization (author or admin)
    const isAuthor = comment.created_by === userId;
    const isAdmin = userRole === 'admin';

    if (!isAuthor && !isAdmin) {
      return {
        success: false,
        message: 'You do not have permission to delete this comment',
        errorCode: 'FORBIDDEN',
      };
    }

    // Step 5: Soft delete comment in database
    await deleteWishlistComment(commentId);

    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete comment';
    console.error('Error in deleteWishlistComment:', error);

    return {
      success: false,
      message,
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
