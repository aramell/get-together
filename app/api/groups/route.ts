import { NextRequest, NextResponse } from 'next/server';
import { createGroupSchema } from '@/lib/validation/groupSchema';
import { ZodError } from 'zod';
import { getClient } from '@/lib/db/client';
import { getUserIdFromRequest } from '@/lib/api/auth';

/**
 * POST /api/groups
 * Create a new group
 * Requires authentication (handled by middleware)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body with Zod
    const validatedData = createGroupSchema.parse({
      name: body.name,
      description: body.description || null,
    });

    // Extract user ID (Cognito sub) from JWT token in cookies
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // TODO: Database operations (requires schema migration)
    // 1. Create group record with invite_code and invite_url
    // 2. Add creator as admin in group_memberships table
    // 3. Return created group with invite_url

    // For now, return mock successful response
    const mockGroup = {
      id: `group-${Date.now()}`,
      name: validatedData.name,
      description: validatedData.description,
      created_by: userId,
      invite_code: body.invite_code || 'mock-invite-code',
      invite_url: body.invite_code ? `https://gettogether.app/join/${body.invite_code}` : 'https://gettogether.app/join/mock',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Group created successfully',
        group: mockGroup,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      const validationErrors = error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: validationErrors,
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 422 }
      );
    }

    // Handle unexpected errors
    console.error('Group creation API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/groups
 * Two modes:
 * 1. GET /api/groups - Retrieve all groups for the authenticated user
 * 2. GET /api/groups/:id - Retrieve specific group by ID
 */
export async function GET(request: NextRequest) {
  let client;
  try {
    console.log('[Groups GET] Starting, userId extraction...');

    // Extract user ID (Cognito sub) from JWT token in cookies
    const userId = getUserIdFromRequest(request);
    console.log('[Groups GET] userId:', userId);

    if (!userId) {
      console.log('[Groups GET] No userId, returning 401');
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Check if this is a query for all user groups (no /:id in path)
    const isRootGroupsPath = request.nextUrl.pathname === '/api/groups';
    console.log('[Groups GET] isRootGroupsPath:', isRootGroupsPath);

    if (isRootGroupsPath) {
      console.log('[Groups GET] Mode 1: Getting all groups for user', userId);

      // Get database client
      console.log('[Groups GET] Getting database client...');
      client = await getClient();
      console.log('[Groups GET] Got database client');

      // Query groups where user is a member
      console.log('[Groups GET] Executing groups query...');
      const result = await client.query(
        `SELECT
          g.id,
          g.name,
          g.description,
          g.created_by,
          g.created_at,
          g.updated_at,
          gm.role as user_role,
          (SELECT COUNT(*) FROM group_memberships WHERE group_id = g.id) as member_count
        FROM groups g
        LEFT JOIN group_memberships gm ON g.id = gm.group_id AND gm.user_id = $1
        WHERE g.deleted_at IS NULL AND gm.user_id = $1
        ORDER BY g.updated_at DESC`,
        [userId]
      );
      console.log('[Groups GET] Query complete, rows:', result.rows.length);

      // If no groups found, return empty array but still successful
      const groups = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        created_by: row.created_by,
        member_count: parseInt(row.member_count),
        user_role: row.user_role,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      console.log('[Groups GET] Returning groups:', groups.length);
      return NextResponse.json({
        success: true,
        message: 'Groups retrieved successfully',
        groups,
      });
    }

    // Mode 2: Get specific group by ID from URL path
    const pathSegments = request.nextUrl.pathname.split('/');
    const groupId = pathSegments[pathSegments.length - 1];

    if (!groupId || groupId === 'groups') {
      return NextResponse.json(
        {
          success: false,
          message: 'Group ID is required',
          errorCode: 'MISSING_GROUP_ID',
        },
        { status: 400 }
      );
    }

    // Verify user is a member of this group
    const memberCheckResult = await client.query(
      `SELECT role FROM group_memberships WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheckResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are not a member of this group',
          errorCode: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Fetch group from database
    const groupResult = await client.query(
      `SELECT g.*, gm.role as user_role, (SELECT COUNT(*) FROM group_memberships WHERE group_id = g.id) as member_count
       FROM groups g
       JOIN group_memberships gm ON g.id = gm.group_id
       WHERE g.id = $1 AND g.deleted_at IS NULL`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Group not found',
          errorCode: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const group = groupResult.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Group retrieved successfully',
      group,
    });
  } catch (error) {
    console.error('[Groups GET] Error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      console.log('[Groups GET] Releasing database client');
      client.release();
    }
  }
}
