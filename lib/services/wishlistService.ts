'use server';

import { getUserGroupRole } from '@/lib/db/queries';
import {
  createWishlistItem,
  getWishlistItems,
  getWishlistItemCount,
  getWishlistItemById,
  softDeleteWishlistItem,
  createWishlistComment,
  getWishlistComments,
} from '@/lib/db/queries';
import { query as executeQuery } from '@/lib/db/client';
import {
  createWishlistItemSchema,
  type CreateWishlistItemInput,
  type WishlistItemResponse,
  type WishlistListResponse,
} from '@/lib/validation/wishlistSchema';
import { ZodError } from 'zod';

/**
 * Create a new wishlist item for a group
 * Validates authorization and input data
 */
export async function createWishlistItemService(
  groupId: string,
  userId: string,
  data: CreateWishlistItemInput
): Promise<{
  success: boolean;
  message: string;
  data?: WishlistItemResponse;
  error?: string;
  errorCode?: string;
}> {
  try {
    // Validate inputs
    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate item data using Zod
    const validatedData = createWishlistItemSchema.parse(data);

    // Check if user is a member of the group
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to add wishlist items',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Clean up empty strings
    const description = validatedData.description || null;
    const link = validatedData.link || null;

    // Create the wishlist item
    const item = await createWishlistItem(
      groupId,
      userId,
      validatedData.title,
      description,
      link
    );

    return {
      success: true,
      message: 'Item added to wishlist',
      data: item as WishlistItemResponse,
    };
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      // Collect all field errors
      const fieldErrors = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');

      return {
        success: false,
        message: fieldErrors || 'Validation failed',
        error: 'VALIDATION_ERROR',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Handle other errors
    console.error('Error creating wishlist item:', error);
    return {
      success: false,
      message: 'Failed to create wishlist item',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get wishlist items for a group with pagination
 * Filters by group membership and includes interest counts and status
 */
export async function getWishlistItemsService(
  groupId: string,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  success: boolean;
  message: string;
  data?: WishlistListResponse;
  error?: string;
  errorCode?: string;
}> {
  try {
    // Validate inputs
    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Check if user is a member of the group
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to view wishlist items',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Validate pagination parameters
    const validLimit = Math.min(Math.max(1, limit), 100);
    const validOffset = Math.max(0, offset);

    // Get items and total count
    const items = await getWishlistItems(groupId, validLimit, validOffset);
    const total = await getWishlistItemCount(groupId);

    const hasMore = validOffset + validLimit < total;

    // Enrich items with interest data
    const { getInterestCount, getUserInterestStatus } = await import('@/lib/db/queries');
    const enrichedItems = await Promise.all(
      items.map(async (item) => ({
        ...item,
        interest_count: await getInterestCount(item.id),
        user_is_interested: await getUserInterestStatus(item.id, userId),
      }))
    );

    return {
      success: true,
      message: 'Wishlist items retrieved',
      data: {
        items: enrichedItems as WishlistItemResponse[],
        total,
        limit: validLimit,
        offset: validOffset,
        hasMore,
      },
    };
  } catch (error) {
    console.error('Error retrieving wishlist items:', error);
    return {
      success: false,
      message: 'Failed to retrieve wishlist items',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get a single wishlist item by ID
 * Validates that user is a member of the item's group and includes interest data
 */
export async function getWishlistItemService(
  itemId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  data?: WishlistItemResponse;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!itemId || typeof itemId !== 'string') {
      return {
        success: false,
        message: 'Item ID is required',
        error: 'INVALID_ITEM_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Get the item
    const item = await getWishlistItemById(itemId);

    if (!item) {
      return {
        success: false,
        message: 'Item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Verify user is a member of the item's group
    const userRole = await getUserGroupRole(item.group_id, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to view this item',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Enrich item with interest data
    const { getInterestCount, getUserInterestStatus } = await import('@/lib/db/queries');
    const enrichedItem = {
      ...item,
      interest_count: await getInterestCount(itemId),
      user_is_interested: await getUserInterestStatus(itemId, userId),
    } as WishlistItemResponse;

    return {
      success: true,
      message: 'Item retrieved',
      data: enrichedItem,
    };
  } catch (error) {
    console.error('Error retrieving wishlist item:', error);
    return {
      success: false,
      message: 'Failed to retrieve wishlist item',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Delete a wishlist item (soft delete)
 * Only the creator or group admin can delete
 */
export async function deleteWishlistItemService(
  itemId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!itemId || typeof itemId !== 'string') {
      return {
        success: false,
        message: 'Item ID is required',
        error: 'INVALID_ITEM_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Get the item
    const item = await getWishlistItemById(itemId);

    if (!item) {
      return {
        success: false,
        message: 'Item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Check authorization: only creator or group admin can delete
    const userRole = await getUserGroupRole(item.group_id, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to delete items',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    if (userRole !== 'admin' && item.created_by !== userId) {
      return {
        success: false,
        message: 'You can only delete your own items',
        error: 'UNAUTHORIZED',
        errorCode: 'FORBIDDEN',
      };
    }

    // Soft delete the item
    await softDeleteWishlistItem(itemId);

    return {
      success: true,
      message: 'Item deleted',
    };
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    return {
      success: false,
      message: 'Failed to delete wishlist item',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Mark interest on a wishlist item
 * Validates group membership before allowing the operation
 * @param itemId - The wishlist item ID
 * @param userId - The user ID who is marking interest
 */
export async function markInterestService(
  itemId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  data?: { interest_count: number };
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!itemId || typeof itemId !== 'string') {
      return {
        success: false,
        message: 'Item ID is required',
        error: 'INVALID_ITEM_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Get the item to verify it exists and optionally check group
    const item = await getWishlistItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: 'Wishlist item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Verify user is a member of the group
    const userRole = await getUserGroupRole(item.group_id, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to mark interest',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Mark interest
    const { markInterest, getInterestCount } = await import('@/lib/db/queries');
    try {
      await markInterest(itemId, userId);
    } catch (error: any) {
      // Check if it's a unique constraint violation (already interested)
      if (error.code === '23505') {
        return {
          success: false,
          message: 'You have already marked interest on this item',
          error: 'ALREADY_INTERESTED',
          errorCode: 'CONFLICT',
        };
      }
      throw error;
    }

    // Get updated count
    const count = await getInterestCount(itemId);

    return {
      success: true,
      message: 'Interest marked',
      data: { interest_count: count },
    };
  } catch (error) {
    console.error('Error marking interest:', error);
    return {
      success: false,
      message: 'Failed to mark interest',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Unmark interest on a wishlist item
 * Validates group membership before allowing the operation
 * @param itemId - The wishlist item ID
 * @param userId - The user ID who is unmarking interest
 */
export async function unmarkInterestService(
  itemId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
  data?: { interest_count: number };
  error?: string;
  errorCode?: string;
}> {
  try {
    if (!itemId || typeof itemId !== 'string') {
      return {
        success: false,
        message: 'Item ID is required',
        error: 'INVALID_ITEM_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Get the item to verify it exists
    const item = await getWishlistItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: 'Wishlist item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Verify user is a member of the group
    const userRole = await getUserGroupRole(item.group_id, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to unmark interest',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Unmark interest
    const { unmarkInterest, getInterestCount } = await import('@/lib/db/queries');
    await unmarkInterest(itemId, userId);

    // Get updated count
    const count = await getInterestCount(itemId);

    return {
      success: true,
      message: 'Interest unmarked',
      data: { interest_count: count },
    };
  } catch (error) {
    console.error('Error unmarking interest:', error);
    return {
      success: false,
      message: 'Failed to unmark interest',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Convert a wishlist item to an event proposal
 * Only the item creator or group admin can convert
 * Once converted, the item cannot be converted again
 * @param groupId - The group ID
 * @param itemId - The wishlist item ID to convert
 * @param userId - The user ID initiating the conversion
 * @param eventData - Event creation data (date, description, threshold)
 */
export async function convertItemToEvent(
  groupId: string,
  itemId: string,
  userId: string,
  eventData: {
    date: string;
    description?: string;
    threshold?: number;
  }
): Promise<{
  success: boolean;
  message: string;
  data?: {
    event: {
      id: string;
      group_id: string;
      created_by: string;
      title: string;
      description: string | null;
      date: string;
      threshold: number | null;
      status: string;
      created_at: string;
      updated_at: string;
    };
    itemToEventLink: {
      itemId: string;
      eventId: string;
    };
  };
  error?: string;
  errorCode?: string;
}> {
  const { getClient } = await import('@/lib/db/client');
  const client = await getClient();

  try {
    // Validate inputs
    if (!groupId || typeof groupId !== 'string') {
      return {
        success: false,
        message: 'Group ID is required',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!itemId || typeof itemId !== 'string') {
      return {
        success: false,
        message: 'Item ID is required',
        error: 'INVALID_ITEM_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate event data
    const { validateConvertToEventRequest } = await import('@/lib/validation/convertToEventSchema');
    const validation = validateConvertToEventRequest(eventData);
    if (!validation.success) {
      return {
        success: false,
        message: validation.error || 'Validation failed',
        error: validation.error,
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Get the wishlist item
    const item = await getWishlistItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: 'Wishlist item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Verify item belongs to the group
    if (item.group_id !== groupId) {
      return {
        success: false,
        message: 'Item does not belong to this group',
        error: 'INVALID_GROUP_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Check authorization: user must be item creator or group admin
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to convert items',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    if (userRole !== 'admin' && item.created_by !== userId) {
      return {
        success: false,
        message: 'Only the item creator or group admin can convert this item',
        error: 'UNAUTHORIZED',
        errorCode: 'FORBIDDEN',
      };
    }

    // Check if already converted
    if (item.item_to_event_id) {
      return {
        success: false,
        message: 'This item has already been converted to an event',
        error: 'ALREADY_CONVERTED',
        errorCode: 'CONFLICT',
      };
    }

    try {
      // Start transaction
      await client.query('BEGIN');

      // Create event proposal using item title and optionally modified description
      const eventResult = await client.query(
        `INSERT INTO event_proposals (group_id, created_by, title, description, date, threshold, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'proposal')
         RETURNING id, group_id, created_by, title, description, date, threshold, status, created_at, updated_at`,
        [
          groupId,
          userId,
          item.title,
          eventData.description || item.description || null,
          eventData.date,
          eventData.threshold || null,
        ]
      );

      if (eventResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Failed to create event',
          error: 'CREATE_FAILED',
          errorCode: 'INTERNAL_ERROR',
        };
      }

      const event = eventResult.rows[0];

      // Update wishlist item with event link
      const updateResult = await client.query(
        `UPDATE wishlist_items
         SET item_to_event_id = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id`,
        [event.id, itemId]
      );

      if (updateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'Failed to link item to event',
          error: 'UPDATE_FAILED',
          errorCode: 'INTERNAL_ERROR',
        };
      }

      // Create RSVP for creator (auto-mark as "in")
      await client.query(
        `INSERT INTO event_rsvps (event_id, user_id, status)
         VALUES ($1, $2, 'in')`,
        [event.id, userId]
      );

      // Commit transaction
      await client.query('COMMIT');

      return {
        success: true,
        message: `Event created from "${item.title}"`,
        data: {
          event: {
            id: event.id,
            group_id: event.group_id,
            created_by: event.created_by,
            title: event.title,
            description: event.description,
            date: event.date,
            threshold: event.threshold,
            status: event.status,
            created_at: event.created_at,
            updated_at: event.updated_at,
          },
          itemToEventLink: {
            itemId: itemId,
            eventId: event.id,
          },
        },
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error in conversion transaction:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('Error converting item to event:', error);

    // Handle specific database errors
    if (error.code === '23505') {
      // Unique constraint violation
      return {
        success: false,
        message: 'An event with similar data already exists',
        error: 'DUPLICATE_EVENT',
        errorCode: 'CONFLICT',
      };
    }

    if (error.code === '23503') {
      // Foreign key violation
      return {
        success: false,
        message: 'Invalid reference in conversion',
        error: 'INVALID_REFERENCE',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    return {
      success: false,
      message: 'Failed to convert item to event',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

// ============================================================================
// Wishlist Comments (Story 6-2: Add Comments to Wishlist Items)
// ============================================================================

/**
 * Create a comment on a wishlist item
 */
export async function createWishlistCommentService(
  groupId: string,
  itemId: string,
  userId: string,
  content: string
): Promise<{
  success: boolean;
  message: string;
  data?: {
    id: string;
    content: string;
    created_by: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  error?: string;
  errorCode?: string;
}> {
  try {
    // Validate Cognito sub (userId)
    if (!userId || typeof userId !== 'string') {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate group and item IDs
    if (!groupId || !itemId) {
      return {
        success: false,
        message: 'Group ID and item ID are required',
        error: 'INVALID_IDS',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Validate content
    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return {
        success: false,
        message: 'Comment cannot be empty',
        error: 'EMPTY_COMMENT',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    if (trimmedContent.length > 2000) {
      return {
        success: false,
        message: 'Comment must be 2000 characters or less',
        error: 'COMMENT_TOO_LONG',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Check user is group member
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to comment',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Check wishlist item exists
    const item = await getWishlistItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: 'Wishlist item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Check item belongs to group
    if (item.group_id !== groupId) {
      return {
        success: false,
        message: 'Item does not belong to this group',
        error: 'ITEM_GROUP_MISMATCH',
        errorCode: 'FORBIDDEN',
      };
    }

    // Create the comment
    const comment = await createWishlistComment(itemId, groupId, userId, trimmedContent);

    // Fetch user info to include in response (AC5 requirement)
    const userInfo = await executeQuery(
      `SELECT display_name, avatar_url FROM users WHERE id = $1`,
      [userId]
    );

    return {
      success: true,
      message: 'Comment posted',
      data: {
        id: comment.id,
        content: comment.content,
        created_by: comment.created_by,
        display_name: userInfo?.rows?.[0]?.display_name || null,
        avatar_url: userInfo?.rows?.[0]?.avatar_url || null,
        created_at: comment.created_at,
      },
    };
  } catch (error) {
    console.error('Error creating wishlist comment:', error);
    return {
      success: false,
      message: 'Failed to post comment',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get comments for a wishlist item
 */
export async function getWishlistCommentsService(
  groupId: string,
  itemId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  success: boolean;
  message: string;
  data?: {
    comments: Array<{
      id: string;
      content: string;
      created_by: string;
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;
    }>;
    totalCount: number;
    hasMore: boolean;
  };
  error?: string;
  errorCode?: string;
}> {
  try {
    // Validate user ID
    if (!userId) {
      return {
        success: false,
        message: 'User ID is required',
        error: 'INVALID_USER_ID',
        errorCode: 'VALIDATION_ERROR',
      };
    }

    // Check user is group member
    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return {
        success: false,
        message: 'You must be a group member to view comments',
        error: 'USER_NOT_MEMBER',
        errorCode: 'FORBIDDEN',
      };
    }

    // Check wishlist item exists
    const item = await getWishlistItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: 'Wishlist item not found',
        error: 'ITEM_NOT_FOUND',
        errorCode: 'NOT_FOUND',
      };
    }

    // Check item belongs to group
    if (item.group_id !== groupId) {
      return {
        success: false,
        message: 'Item does not belong to this group',
        error: 'ITEM_GROUP_MISMATCH',
        errorCode: 'FORBIDDEN',
      };
    }

    // Import database function
    const { getWishlistComments } = await import('@/lib/db/queries');

    // Fetch comments
    const { comments, totalCount } = await getWishlistComments(itemId, limit, offset);

    return {
      success: true,
      message: 'Comments fetched',
      data: {
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          created_by: c.created_by,
          display_name: c.display_name,
          avatar_url: c.avatar_url,
          created_at: c.created_at,
        })),
        totalCount,
        hasMore: offset + limit < totalCount,
      },
    };
  } catch (error) {
    console.error('Error fetching wishlist comments:', error);
    return {
      success: false,
      message: 'Failed to fetch comments',
      error: 'INTERNAL_ERROR',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}
