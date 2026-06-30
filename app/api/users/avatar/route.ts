import { NextRequest, NextResponse } from 'next/server';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

/**
 * POST /api/users/avatar
 * Upload avatar file to S3 and update user profile
 * Requires authentication and multipart file upload
 */
export async function POST(request: NextRequest) {
  try {
    // Extract form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided', errorCode: 'NO_FILE' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required', errorCode: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please upload a valid image file (JPG, PNG, GIF)',
          errorCode: 'INVALID_FILE_TYPE',
        },
        { status: 422 }
      );
    }

    // Validate file size
    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: 'Avatar must be less than 2MB',
          errorCode: 'FILE_TOO_LARGE',
        },
        { status: 422 }
      );
    }

    // In production, this would:
    // 1. Extract user ID from JWT token (verify userId matches)
    // 2. Convert file to buffer
    // 3. Upload to S3 with path: avatars/{user_id}/{timestamp}-{filename}
    // 4. Get signed URL for avatar
    // 5. Delete old avatar from S3 if it exists
    // 6. Update avatar_url in Postgres users table
    // 7. Return signed URL

    const timestamp = Date.now();
    const filename = file.name.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
    const s3Path = `avatars/${userId}/${timestamp}-${filename}`;

    // Mock S3 URL (in production, would be actual S3 signed URL)
    const avatarUrl = `https://s3.amazonaws.com/get-together-avatars/${s3Path}`;

    return NextResponse.json(
      {
        success: true,
        message: 'Avatar uploaded successfully',
        url: avatarUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: 'Invalid request', errorCode: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload avatar', errorCode: 'UPLOAD_ERROR' },
      { status: 500 }
    );
  }
}
