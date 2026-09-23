import { z } from 'zod';
import { phoneNumberSchema } from './smsAuthSchema';

/**
 * Schema for creating a social circle (Story 10.1)
 * Name is required (whitespace-only rejected via trim-then-min) and capped at 100 chars (AC2, AC4)
 */
export const createCircleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Circle name is required')
    .max(100, 'Circle name must be 100 characters or less'),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;

export const circleResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  contactCount: z.number(),
  createdAt: z.string(),
});

export type CircleResponse = z.infer<typeof circleResponseSchema>;

/**
 * Schema for adding a contact to a social circle (Story 10.2)
 * Discriminates on `type`: phone values must be E.164 (AC3, reusing the
 * same validation/message as SMS auth); username values are a free-text
 * name/email query resolved by the service layer (AC2, AC4).
 */
export const addContactSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('phone'),
    value: phoneNumberSchema,
  }),
  z.object({
    type: z.literal('user'),
    value: z.string().trim().min(1, 'Please enter a name or email'),
  }),
]);

export type AddContactInput = z.infer<typeof addContactSchema>;

export const contactResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['phone', 'user']),
  displayName: z.string(),
});

export type ContactResponse = z.infer<typeof contactResponseSchema>;
