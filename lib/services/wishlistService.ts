import { getUserGroupRole } from '@/lib/db/queries';
import {
  createWishlistItem,
  getWishlistItems,
  getWishlistItemCount,
  getWishlistItemById,
  softDeleteWishlistItem,
} from '@/lib/db/queries';
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
 */
export async function markInterestService(
  itemId: string,
  userId: string,
  groupId?: string
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
 */
export async function unmarkInterestService(
  itemId: string,
  userId: string,
  groupId?: string
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
