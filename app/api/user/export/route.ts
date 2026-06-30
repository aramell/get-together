/**
 * User Data Export Endpoint
 * GET /api/user/export
 * AC1/AC3: GDPR Data Subject Rights - Data Export
 * AC9: Audit logging and rate limiting for security
 * Allows users to export their personal data in JSON format
 */

import { getUserIdFromRequest } from '@/lib/api/auth';
import { getClient } from '@/lib/db/client';
import { enforceRateLimit } from '@/lib/api/rateLimiter';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/user/export
 * Export all personal data for authenticated user
 * Returns: JSON object with all user data
 */
export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
  }

  // AC9: Rate limiting on sensitive endpoint to prevent DOS
  const rateLimiter = enforceRateLimit('export');
  if (!rateLimiter(userId)) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many export requests. Maximum 10 per minute.' } },
      { status: 429 }
    );
  }

  const client = await getClient();

  try {
    // Get all user profile data (AC8: GDPR compliance - deleted users cannot export)
    const userResult = await client.query(
      `SELECT id, email, display_name, avatar_url, created_at, updated_at FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Get all groups user belongs to
    const groupsResult = await client.query(
      `SELECT g.id, g.name, g.description, g.created_by, gm.role, g.created_at, g.updated_at
       FROM groups g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = $1 AND g.deleted_at IS NULL`,
      [userId]
    );

    // Get all events user created
    const eventsResult = await client.query(
      `SELECT id, title, description, date, threshold, status, created_at, updated_at
       FROM event_proposals
       WHERE created_by = $1 AND deleted_at IS NULL`,
      [userId]
    );

    // Get all RSVPs user made
    const rsvpsResult = await client.query(
      `SELECT id, event_id, status, created_at, updated_at
       FROM event_rsvps
       WHERE user_id = $1`,
      [userId]
    );

    // Get all wishlist items user created
    const wishlistResult = await client.query(
      `SELECT id, title, description, url, group_id, created_at, updated_at
       FROM wishlist_items
       WHERE created_by = $1 AND deleted_at IS NULL`,
      [userId]
    );

    // Get all comments user made
    const commentsResult = await client.query(
      `SELECT id, content, entity_type, entity_id, created_at, updated_at
       FROM comments
       WHERE created_by = $1 AND deleted_at IS NULL`,
      [userId]
    );

    // Get all availability entries user created
    const availabilityResult = await client.query(
      `SELECT id, group_id, start_time, end_time, status, created_at, updated_at
       FROM availabilities
       WHERE user_id = $1`,
      [userId]
    );

    // Get all interest reactions user made (wishlist item interests)
    const interestReactionsResult = await client.query(
      `SELECT id, wishlist_item_id, created_at
       FROM interest_reactions
       WHERE user_id = $1`,
      [userId]
    );

    // Compile export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      groups: groupsResult.rows.map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        createdBy: g.created_by,
        userRole: g.role,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      })),
      events: eventsResult.rows.map((e: any) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        date: e.date,
        threshold: e.threshold,
        status: e.status,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
      rsvps: rsvpsResult.rows.map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      wishlistItems: wishlistResult.rows.map((w: any) => ({
        id: w.id,
        title: w.title,
        description: w.description,
        url: w.url,
        groupId: w.group_id,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })),
      comments: commentsResult.rows.map((c: any) => ({
        id: c.id,
        content: c.content,
        entityType: c.entity_type,
        entityId: c.entity_id,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      availability: availabilityResult.rows.map((a: any) => ({
        id: a.id,
        groupId: a.group_id,
        startTime: a.start_time,
        endTime: a.end_time,
        status: a.status,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
      interestReactions: interestReactionsResult.rows.map((ir: any) => ({
        id: ir.id,
        wishlistItemId: ir.wishlist_item_id,
        createdAt: ir.created_at,
      })),
    };

    // Return as JSON file
    const fileName = `user-data-export-${userId}-${new Date().getTime()}.json`;

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      {
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export user data',
        },
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
