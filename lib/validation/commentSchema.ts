import { z } from 'zod';

/**
 * Zod schema for validating event comment input
 * - content: text comment (1-2000 chars, no empty/whitespace-only)
 * - event_id: UUID of the event
 * - group_id: UUID of the group
 */
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be 2000 characters or less')
    .refine((val) => val.trim().length > 0, {
      message: 'Comment cannot contain only whitespace',
    }),
  event_id: z.string().uuid('Invalid event ID format'),
  group_id: z.string().uuid('Invalid group ID format'),
});

export type CommentInput = z.infer<typeof commentSchema>;

/**
 * Helper function to validate comment input
 * Returns { success, data?, error? }
 */
export function validateCommentInput(
  data: unknown
): { success: boolean; data?: CommentInput; error?: string } {
  const result = commentSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format first error message for display
  const firstError = result.error.issues[0];
  const errorMessage = firstError?.message || 'Invalid comment data';

  return { success: false, error: errorMessage };
}

/**
 * Zod schema for validating wishlist comment input
 * - content: text comment (1-2000 chars, no empty/whitespace-only)
 * - wishlist_item_id: UUID of the wishlist item
 * - group_id: UUID of the group
 */
export const wishlistCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be 2000 characters or less')
    .refine((val) => val.trim().length > 0, {
      message: 'Comment cannot contain only whitespace',
    }),
  wishlist_item_id: z.string().uuid('Invalid wishlist item ID format'),
  group_id: z.string().uuid('Invalid group ID format'),
});

export type WishlistCommentInput = z.infer<typeof wishlistCommentSchema>;

/**
 * Helper function to validate wishlist comment input
 * Returns { success, data?, error? }
 */
export function validateWishlistCommentInput(
  data: unknown
): { success: boolean; data?: WishlistCommentInput; error?: string } {
  const result = wishlistCommentSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format first error message for display
  const firstError = result.error.issues[0];
  const errorMessage = firstError?.message || 'Invalid comment data';

  return { success: false, error: errorMessage };
}
