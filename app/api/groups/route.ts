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
      const validationErrors = error.errors.map((err) => ({
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
 * GET /api/groups/:id
 * Retrieve group details by ID
 */
export async function GET(request: NextRequest) {
  try {
    // Extract group ID from URL path
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
