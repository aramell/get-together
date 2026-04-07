import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/auth';
import { getClient } from '@/lib/db/client';
import { updateProfileSchema } from '@/lib/validation/profileSchema';

/**
 * GET /api/users/profile
 * Retrieve current user's profile
 * Requires authentication (withAuth middleware)
 */
interface AuthContext {
  userId: string;
}

export const GET = withAuth(async (req: NextRequest, context: AuthContext) => {
  const userId = context.userId;

  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const client = await getClient();

  try {
    const result = await client.query(
      `SELECT id, email, display_name, avatar_url, created_at, updated_at, update_timestamp
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        updateTimestamp: user.update_timestamp,
      },
    });
  } catch (error: any) {
    console.error('GET profile error:', error);
    return NextResponse.json(
      { error: { code: 'PROFILE_FETCH_FAILED', message: 'Failed to retrieve profile' } },
      { status: 500 }
    );
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/users/profile
 * Update user's profile (display_name, avatar_url)
 * Requires authentication (withAuth middleware)
 * AC4: GDPR Right to Rectification - Users can correct their profile data
 */
export const PATCH = withAuth(async (req: NextRequest, context: AuthContext) => {
  const userId = context.userId;

  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    // Validate input
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validationResult.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
        },
        { status: 422 }
      );
    }

    const { display_name, avatar_url } = validationResult.data;

    const client = await getClient();

    try {
      // Get current user profile for audit trail (before values)
      const currentResult = await client.query(
        `SELECT display_name, avatar_url, email FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [userId]
      );

      if (currentResult.rows.length === 0) {
        return NextResponse.json(
          { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
          { status: 404 }
        );
      }

      // Update profile with update_timestamp for audit trail (AC4: Right to Rectification)
      // Note: Email changes require verification in future enhancement (Task 6)
      const updateResult = await client.query(
        `UPDATE users SET
           display_name = COALESCE($1, display_name),
           avatar_url = COALESCE($2, avatar_url),
           update_timestamp = NOW(),
           updated_at = NOW(),
           last_activity_at = NOW()
         WHERE id = $3 AND deleted_at IS NULL
         RETURNING id, email, display_name, avatar_url, created_at, updated_at, update_timestamp`,
        [display_name, avatar_url, userId]
      );

      if (updateResult.rows.length === 0) {
        return NextResponse.json(
          { error: { code: 'UPDATE_FAILED', message: 'Failed to update profile' } },
          { status: 500 }
        );
      }

      const updatedUser = updateResult.rows[0];

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
        profile: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.display_name,
          avatarUrl: updatedUser.avatar_url,
          createdAt: updatedUser.created_at,
          updatedAt: updatedUser.updated_at,
          updateTimestamp: updatedUser.update_timestamp,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Invalid JSON' } },
        { status: 400 }
      );
    }

    console.error('PATCH profile error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
});
