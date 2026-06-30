import { z } from 'zod';

/**
 * Validation schema for public RSVP submission
 * AC3: Public RSVP Status Selection requires email validation
 */
export const publicRsvpSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  name: z.string().max(255, 'Name is too long').optional().or(z.literal('')),
  status: z.enum(['in', 'maybe', 'out'], {
    message: 'Please select In, Maybe, or Out',
  }),
});

export type PublicRsvpInput = z.infer<typeof publicRsvpSchema>;

/**
 * Validation schema for public event token
 */
export const publicEventTokenSchema = z.string().min(32).max(64);
