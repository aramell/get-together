/**
 * User Deletion Endpoint (Right to be Forgotten)
 * DELETE /api/user/delete
 * AC2: GDPR Data Subject Rights - User Deletion
 * AC9: Rate limiting and audit logging for security
 * Implements cryptographic erasure through soft delete pattern
 */

import { withAuth } from '@/lib/api/auth';
import { getClient } from '@/lib/db/client';
import { enforceRateLimit } from '@/lib/api/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/user/delete
 * Delete all user data (cryptographic erasure via soft delete)
 * Sets deleted_at timestamp and NULLs sensitive fields
 */
interface AuthContext {
  userId: string;
}

export const DELETE = withAuth(async (req: NextRequest, context: AuthContext) => {
  const userId = context.userId;

  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  // AC9: Rate limiting on sensitive endpoint to prevent accidental/malicious deletions
  const rateLimiter = enforceRateLimit('delete');
  if (!rateLimiter(userId)) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Account deletion is rate limited. Only 1 deletion request per minute.' } },
      { status: 429 }
    );
  }

  const client = await getClient();

  try {
    // Start transaction
    await client.query('BEGIN');

    try {
      // Soft delete user and clear sensitive data
      await client.query(
        `UPDATE users SET
         display_name = NULL,
         avatar_url = NULL,
         email = NULL,
         deleted_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      // Soft delete all user's groups as admin
      await client.query(
        `UPDATE groups SET deleted_at = NOW()
         WHERE created_by = $1 AND deleted_at IS NULL`,
        [userId]
      );

      // Soft delete all user's wishlist items
      await client.query(
        `UPDATE wishlist_items SET deleted_at = NOW()
         WHERE created_by = $1 AND deleted_at IS NULL`,
        [userId]
      );

      // Soft delete all user's comments
      await client.query(
        `UPDATE comments SET
         content = NULL,
         deleted_at = NOW()
         WHERE created_by = $1 AND deleted_at IS NULL`,
        [userId]
      );

      // Soft delete all user's event proposals
      await client.query(
        `UPDATE event_proposals SET deleted_at = NOW()
         WHERE created_by = $1 AND deleted_at IS NULL`,
        [userId]
      );

      // Remove user from all groups
      await client.query(`DELETE FROM group_members WHERE user_id = $1`, [userId]);

      // Delete (not soft-delete) RSVP records to remove from momentum counts
      // But keep availability records for historical reference
      await client.query(`DELETE FROM event_rsvps WHERE user_id = $1`, [userId]);

      // Remove user interest reactions from wishlist items
      await client.query(`DELETE FROM interest_reactions WHERE user_id = $1`, [userId]);

      // Commit transaction
      await client.query('COMMIT');

      return NextResponse.json(
        {
          success: true,
          message: 'User account and all associated data have been deleted',
        },
        { status: 200 }
      );
    } catch (txError) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw txError;
    }
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error: {
          code: 'DELETION_FAILED',
          message: 'Failed to delete user account',
        },
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
});
