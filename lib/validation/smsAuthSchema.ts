import { z } from 'zod';

// E.164 format: + followed by 1-15 digits, first digit non-zero (ITU-T E.164)
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export const phoneNumberSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(
    E164_REGEX,
    'Please enter a valid phone number including country code (e.g., +1 555 000 1234)'
  );

// SMS magic link request schema (AC1, AC2)
export const smsMagicLinkRequestSchema = z.object({
  phoneNumber: phoneNumberSchema,
  targetType: z.enum(['group', 'event']).optional(),
  targetId: z.string().uuid().optional(),
});

export type SmsMagicLinkRequestData = z.infer<typeof smsMagicLinkRequestSchema>;
