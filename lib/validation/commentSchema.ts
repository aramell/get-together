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

/**
 * Commentable item types (Story 14.2). Validated in application code, not a
 * DB CHECK, so adding a type needs no schema change.
 */
export const COMMENT_ITEM_TYPES = ['checklist', 'logistics', 'timeline', 'poll'] as const;
export type CommentItemType = (typeof COMMENT_ITEM_TYPES)[number];

export function isCommentItemType(value: unknown): value is CommentItemType {
  return typeof value === 'string' && (COMMENT_ITEM_TYPES as readonly string[]).includes(value);
}

/**
 * Zod schema for validating comment input on any commentable item
 * - item_type: one of COMMENT_ITEM_TYPES
 * - item_id: UUID of the item
 * - group_id: UUID of the group
 * - content: text comment (1-2000 chars, no empty/whitespace-only)
 */
export const itemCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be 2000 characters or less')
    .refine((val) => val.trim().length > 0, {
      message: 'Comment cannot contain only whitespace',
    }),
  item_type: z.enum(COMMENT_ITEM_TYPES, { message: 'Invalid comment item type' }),
  item_id: z.string().uuid('Invalid item ID format'),
  group_id: z.string().uuid('Invalid group ID format'),
});

export type ItemCommentInput = z.infer<typeof itemCommentSchema>;

/**
 * Helper function to validate item comment input
 * Returns { success, data?, error? }
 */
export function validateItemCommentInput(
  data: unknown
): { success: boolean; data?: ItemCommentInput; error?: string } {
  const result = itemCommentSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || 'Invalid comment data' };
}
