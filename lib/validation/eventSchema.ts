import { z } from 'zod';

// Event creation schema - used for both client and server validation
export const eventCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Event title is required')
    .max(255, 'Event title must be 255 characters or less'),

  date: z
    .string()
    .datetime('Invalid date format')
    .refine(
      (dateStr) => new Date(dateStr) > new Date(),
      'Event date must be in the future'
    ),

  threshold: z
    .number()
    .int('Threshold must be a whole number')
    .positive('Threshold must be greater than 0')
    .max(1000, 'Threshold is too large')
    .optional(),

  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional(),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

// RSVP status schema
export const rsvpStatusSchema = z.enum(['in', 'maybe', 'out']);
export type RsvpStatus = z.infer<typeof rsvpStatusSchema>;

// Event proposal response schema
export const eventProposalSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid(),
  created_by: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  date: z.string().datetime(),
  threshold: z.number().nullable(),
  status: z.enum(['proposal', 'confirmed', 'cancelled']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type EventProposal = z.infer<typeof eventProposalSchema>;

/**
 * Validate event creation input
 * Throws ZodError if validation fails
 */
export function validateEventCreate(data: unknown) {
  try {
    return eventCreateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return first error message
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
