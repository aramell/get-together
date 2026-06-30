/**
 * Storage Service
 * Handles avatar uploads via AWS Amplify Storage (S3)
 */

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

export interface UploadAvatarResponse {
  success: boolean;
  message: string;
  url?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Validate avatar file before upload
 * Checks file type and size
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_AVATAR_SIZE) {
    return {
      valid: false,
      error: 'Avatar must be less than 2MB',
    };
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPG, PNG, GIF)',
    };
  }

  return { valid: true };
}

/**
 * Upload avatar file to S3 via API
 * Returns signed URL for avatar_url field
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<UploadAvatarResponse> {
  try {
    // Validate file first
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || 'Invalid file',
        errorCode: 'INVALID_FILE',
      };
    }

    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    // Upload via API endpoint
    const response = await fetch('/api/users/avatar', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Failed to upload avatar',
        errorCode: errorData.errorCode || 'UPLOAD_FAILED',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Avatar updated successfully',
      url: data.url,
    };
  } catch (error: any) {
    console.error('Avatar upload error:', error);
    return {
      success: false,
      message: 'Failed to upload avatar',
      errorCode: 'UPLOAD_ERROR',
    };
  }
}

/**
 * Delete old avatar from S3
 * Called when user uploads a new avatar
 */
export async function deleteOldAvatar(userId: string, oldAvatarUrl?: string): Promise<void> {
  try {
    if (!oldAvatarUrl) {
      return; // No old avatar to delete
    }

    // In production, this would call an API endpoint to delete from S3
    // For now, just log the intent
    console.log(`Deleting old avatar for user ${userId}: ${oldAvatarUrl}`);
  } catch (error) {
    console.error('Failed to delete old avatar:', error);
    // Don't throw - avatar upload succeeded even if cleanup failed
  }
}

/**
 * Generate S3 avatar file path
 * Format: /avatars/{user_id}/{timestamp}-{filename}
 */
export function generateAvatarPath(userId: string, filename: string): string {
  const timestamp = Date.now();
  return `avatars/${userId}/${timestamp}-${sanitizeFilename(filename)}`;
}

/**
 * Sanitize filename for safe S3 storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}
