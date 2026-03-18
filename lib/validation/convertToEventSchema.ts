import { z } from 'zod';

/**
 * Schema for converting a wishlist item to an event
 * Pre-filled fields: title (from item), description (from item, editable)
 * Required fields: date, time
 * Optional fields: threshold
 */
export const convertToEventSchema = z.object({
  // Item ID being converted (validation only)
  itemId: z
    .string()
    .uuid('Invalid item ID'),

  // Date and time are required for event
  date: z
    .string()
    .datetime('Invalid date format')
    .refine(
      (dateStr) => new Date(dateStr) > new Date(),
      'Event date must be in the future'
    ),

  // Description can be modified from the original item description
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .or(z.literal('')),

  // Threshold is optional, can be suggested based on interest count
  threshold: z
    .number()
    .int('Threshold must be a whole number')
    .positive('Threshold must be greater than 0')
    .max(1000, 'Threshold is too large')
    .optional()
    .or(z.literal(null)),
});

export type ConvertToEventInput = z.infer<typeof convertToEventSchema>;

/**
 * Schema for the conversion request body (sent to API)
 * Does NOT include itemId as it comes from URL param
 */
export const convertToEventRequestSchema = z.object({
  date: z
    .string()
    .datetime('Invalid date format')
    .refine(
      (dateStr) => new Date(dateStr) > new Date(),
      'Event date must be in the future'
    ),

  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .or(z.literal('')),

  threshold: z
    .number()
    .int('Threshold must be a whole number')
    .positive('Threshold must be greater than 0')
    .max(1000, 'Threshold is too large')
    .optional(),
});

export type ConvertToEventRequest = z.infer<typeof convertToEventRequestSchema>;

/**
 * Response from conversion API
 */
export const conversionResponseSchema = z.object({
  event: z.object({
    id: z.string().uuid(),
    group_id: z.string().uuid(),
    created_by: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    date: z.string().datetime(),
    threshold: z.number().nullable(),
    status: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }),
  itemToEventLink: z.object({
    itemId: z.string().uuid(),
    eventId: z.string().uuid(),
  }),
});

export type ConversionResponse = z.infer<typeof conversionResponseSchema>;

/**
 * Helper function to calculate suggested threshold based on interest count
 * Suggested threshold = 50% of interest count (rounded up)
 */
export function calculateSuggestedThreshold(interestCount: number): number | null {
  if (interestCount <= 0) return null;
  return Math.ceil(interestCount / 2);
}

/**
 * Validate conversion input
 */
export function validateConvertToEvent(data: unknown) {
  try {
    const validated = convertToEventSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError.message,
        errorCode: 'VALIDATION_ERROR',
      };
    }
    throw error;
  }
}

/**
 * Validate conversion request body (from API)
 */
export function validateConvertToEventRequest(data: unknown) {
  try {
    const validated = convertToEventRequestSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError.message,
        errorCode: 'VALIDATION_ERROR',
      };
    }
    throw error;
  }
}
