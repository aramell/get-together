import { NextRequest, NextResponse } from 'next/server';
import { getGroupByInviteCode, addUserToGroup, getUserGroupRole } from '@/lib/db/queries';

/**
 * POST /api/groups/join/:inviteCode
 * Join a group using an invite code
 * Requires user to be authenticated
 *
 * Path parameters:
 * - inviteCode: 16-character hexadecimal invite code
 *
 * Headers:
 * - Authorization: Bearer <JWT token> or Cookie with auth token
 *
 * Response:
 * - 200: Successfully joined group
 * - 201: Already joined, redirected
 * - 400: Invalid invite code format
 * - 401: User not authenticated
 * - 404: Invite code not found
 * - 409: User already a member of the group
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await params;

    // Validate inviteCode format
    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invite code is required',
          error: 'INVALID_INVITE_CODE',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate invite code format (16 hex characters)
    if (!/^[a-f0-9]{16}$/.test(inviteCode)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid invite code format',
          error: 'INVALID_INVITE_CODE',
          errorCode: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Extract userId from JWT token or headers
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      // In production, verify JWT token and extract userId
      // For now, use placeholder or header
      userId = (request as any).userId || request.headers.get('x-user-id');
    }

    // Check if user_id is available from middleware
    if (!userId) {
      userId = (request as any).userId || request.headers.get('x-user-id');
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Fetch group by invite code
    const group = await getGroupByInviteCode(inviteCode);

    if (!group) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired invite code',
          error: 'INVALID_INVITE_CODE',
          errorCode: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingRole = await getUserGroupRole(group.id, userId);

    if (existingRole) {
      return NextResponse.json(
        {
          success: false,
          message: 'You are already a member of this group',
          error: 'ALREADY_MEMBER',
          errorCode: 'CONFLICT',
          group: {
            id: group.id,
            name: group.name,
            description: group.description,
          },
        },
        { status: 409 }
      );
    }

    // Add user to group with member role
    await addUserToGroup(group.id, userId, 'member');

    // Return success response with group details
    return NextResponse.json(
      {
        success: true,
        message: 'Successfully joined group',
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          created_by: group.created_by,
          invite_code: group.invite_code,
          created_at: group.created_at,
          updated_at: group.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Join group API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred while joining the group',
        error: (error as any)?.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/groups/join/:inviteCode
 * Handle CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '';

  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  const isOriginAllowed = allowedOrigins.includes(origin);

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': isOriginAllowed ? origin : '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
