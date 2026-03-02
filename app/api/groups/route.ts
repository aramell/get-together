import { NextRequest, NextResponse } from 'next/server';
import { createGroupSchema } from '@/lib/validation/groupSchema';
import { ZodError } from 'zod';

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

    // Extract user ID from JWT token (via request headers or cookies)
    // For MVP, we'll use a placeholder - in production, verify JWT token
    const userId = body.userId || 'current-user-id'; // TODO: Extract from JWT

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
 * 1. GET /api/groups?user_id=<id> - Retrieve all groups for a user
 * 2. GET /api/groups/:id - Retrieve specific group by ID
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user_id query parameter is present (groups list mode)
    const userId = request.nextUrl.searchParams.get('user_id');

    if (userId) {
      // Mode 1: Get all groups for a user
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json(
          {
            success: false,
            message: 'user_id query parameter is required',
            errorCode: 'MISSING_USER_ID',
          },
          { status: 400 }
        );
      }

      // TODO: Verify user is authenticated
      // TODO: Fetch all groups from database where user is a member
      // TODO: Join with group_memberships to get role
      // TODO: Count members for each group
      // TODO: Get last_activity_date (most recent change to group or its events)

      // For now, return mock groups list
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Weekend Hikers',
          member_count: 5,
          last_activity_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          role: 'admin',
        },
        {
          id: 'group-2',
          name: 'Board Game Night',
          member_count: 3,
          last_activity_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          role: 'member',
        },
      ];

      return NextResponse.json({
        success: true,
        message: 'Groups retrieved successfully',
        groups: mockGroups,
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

    // TODO: Verify user is a member of this group
    // TODO: Fetch group and members from database

    // For now, return mock group
    const mockGroup = {
      id: groupId,
      name: 'Sample Group',
      description: 'A sample group for testing',
      created_by: 'user-id',
      invite_code: 'mock-invite',
      invite_url: `https://gettogether.app/join/mock-invite`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Group retrieved successfully',
      group: mockGroup,
    });
  } catch (error) {
    console.error('Get group API error:', error);

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
