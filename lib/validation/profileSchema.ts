import { z } from 'zod';
import { emailSchema } from './authSchema';

/**
 * Profile update form validation schema
 * Handles updates to display_name and email
 */
export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less')
    .trim(),
  new_email: emailSchema.optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

/**
 * Email confirmation token validation
 * Used when confirming email change via link in email
 */
export const emailConfirmationSchema = z.object({
  token: z.string().min(1, 'Confirmation token is required'),
});

export type EmailConfirmationData = z.infer<typeof emailConfirmationSchema>;

/**
 * Avatar metadata validation
 * Validates file properties before upload
 */
export const avatarUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 2 * 1024 * 1024, {
      message: 'Avatar must be less than 2MB',
    })
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif'].includes(file.type),
      {
        message: 'Please upload a valid image file (JPG, PNG, GIF)',
      }
    ),
});

export type AvatarUploadData = z.infer<typeof avatarUploadSchema>;
