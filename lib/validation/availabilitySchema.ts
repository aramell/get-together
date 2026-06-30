import { z } from 'zod';

/**
 * Availability input schema for creating/updating availability records
 * Validates date/time range and status
 */
export const availabilityInputSchema = z.object({
  start_time: z.string().datetime('Invalid start_time format. Use ISO 8601 format.'),
  end_time: z.string().datetime('Invalid end_time format. Use ISO 8601 format.'),
  status: z.enum(['free', 'busy'], { message: 'Status must be either "free" or "busy"' }),
}).refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  }
);

export type AvailabilityInput = z.infer<typeof availabilityInputSchema>;

/**
 * Availability response schema (what gets returned from API)
 */
export const availabilityResponseSchema = z.object({
  id: z.string().uuid('Invalid availability ID'),
  user_id: z.string().uuid('Invalid user ID'),
  group_id: z.string().uuid('Invalid group ID'),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  status: z.enum(['free', 'busy']),
  version: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Availability = z.infer<typeof availabilityResponseSchema>;

/**
 * Availability list response (with user info for calendar display)
 */
export const availabilityWithUserSchema = availabilityResponseSchema.extend({
  user_name: z.string(),
  user_email: z.string().email(),
});

export type AvailabilityWithUser = z.infer<typeof availabilityWithUserSchema>;
