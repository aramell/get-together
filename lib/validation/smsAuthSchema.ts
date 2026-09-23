import { z } from 'zod';

// E.164 format: + followed by 1-15 digits, first digit non-zero (ITU-T E.164)
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// Small fixed list -- no dependency is installed for full country-code data,
// and adding one is outside this story's scope. Covers the launch markets.
// Shared by PhoneMagicLinkForm and MagicLinkErrorContent.
export const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+61', label: 'AU (+61)' },
  { code: '+33', label: 'FR (+33)' },
  { code: '+49', label: 'DE (+49)' },
];

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
