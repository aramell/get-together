import { NextRequest, NextResponse } from 'next/server';
import { updateProfileSchema } from '@/lib/validation/profileSchema';
import { ZodError } from 'zod';

/**
 * GET /api/users/profile
 * Retrieve current user's profile
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // In production, this would:
    // 1. Extract user ID from JWT token in cookies/headers
    // 2. Query Postgres users table for profile data
    // 3. Return user profile

    // For now, return a template response
    const profile = {
      id: 'user-id',
      email: 'user@example.com',
      display_name: 'User Name',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('GET profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/profile
 * Update user's profile (display_name, request email change, avatar_url)
 * Requires authentication
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errorCode: 'VALIDATION_ERROR',
          errors: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 }
      );
    }

    const { display_name, new_email, avatar_url } = validationResult.data;

    // In production, this would:
    // 1. Extract user ID from JWT token
    // 2. Update display_name in Postgres users table if provided
    // 3. Update avatar_url in Postgres if provided
    // 4. Update Cognito user attributes if display_name changed
    // 5. If new_email provided:
    //    - Generate confirmation token
    //    - Send confirmation email to new address
    //    - Store pending email change (don't update yet)
    // 6. Return updated profile

    const updatedProfile = {
      id: 'user-id',
      email: 'user@example.com',
      display_name: display_name || 'User Name',
      avatar_url: avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let message = 'Profile updated successfully';
    if (new_email) {
      message = `Profile updated. Confirmation email sent to ${new_email}`;
    }

    return NextResponse.json(
      {
        success: true,
        message,
        profile: updatedProfile,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON', errorCode: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errorCode: 'VALIDATION_ERROR',
          errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 422 }
      );
    }

    console.error('PATCH profile error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', errorCode: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
