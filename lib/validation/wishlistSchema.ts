import { z } from 'zod';

/**
 * Schema for creating a wishlist item
 * Validates title (required), description (optional), and link (optional)
 */
export const createWishlistItemSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .trim(),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional()
    .or(z.literal('')),
  link: z
    .string()
    .url('Please enter a valid HTTP or HTTPS URL')
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => !val || (val.startsWith('http://') || val.startsWith('https://')),
      'Link must be a valid HTTP or HTTPS URL'
    ),
});

export type CreateWishlistItemInput = z.infer<typeof createWishlistItemSchema>;

/**
 * Schema for wishlist item response
 * Includes all item fields plus creator information and interest data
 */
export const wishlistItemResponseSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid(),
  created_by: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  link: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  creator_name: z.string().optional(),
  creator_email: z.string().optional(),
  interest_count: z.number().optional(),
  user_is_interested: z.boolean().optional(),
});

export type WishlistItemResponse = z.infer<typeof wishlistItemResponseSchema>;

/**
 * Schema for list response pagination
 */
export const wishlistListResponseSchema = z.object({
  items: z.array(wishlistItemResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
});

export type WishlistListResponse = z.infer<typeof wishlistListResponseSchema>;
