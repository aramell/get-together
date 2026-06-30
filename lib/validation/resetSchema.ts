import { z } from 'zod';
import { emailSchema, passwordSchema } from './authSchema';

// Forgot password form schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password form schema
export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z.string().min(1, 'Reset code is required').min(6, 'Reset code must be at least 6 characters'),
  newPassword: passwordSchema,
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
