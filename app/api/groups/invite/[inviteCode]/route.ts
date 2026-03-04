import { NextRequest, NextResponse } from 'next/server';
import { getGroupByInviteCode, getUserGroupRole } from '@/lib/db/queries';
import { getClient } from '@/lib/db/client';

/**
 * GET /api/groups/invite/:inviteCode
 * Get group preview from invite code (unauthenticated)
 * Returns group info without requiring user to be logged in
 *
 * Path parameters:
 * - inviteCode: 16-character hexadecimal invite code
 *
 * Response:
 * - 200: Group found, preview available
 * - 400: Invalid invite code format
 * - 404: Invite code not found
 * - 500: Server error
 */
export async function GET(
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

    // Get member count for this group
    const client = await getClient();
    try {
      const memberCountResult = await client.query(
        'SELECT COUNT(*) as count FROM group_memberships WHERE group_id = $1',
        [group.id]
      );
      const memberCount = parseInt(memberCountResult.rows[0]?.count || '0', 10);

      // Get current user info if authenticated
      let userIsMember = null;
      const authHeader = request.headers.get('authorization');
      let userId: string | null = null;

      if (authHeader?.startsWith('Bearer ')) {
        userId = (request as any).userId || request.headers.get('x-user-id');
        if (userId) {
          const role = await getUserGroupRole(group.id, userId);
          userIsMember = !!role;
        }
      }

      // Return group preview (do NOT include invite_code in response)
      return NextResponse.json(
        {
          success: true,
          message: 'Group preview retrieved successfully',
          data: {
            group: {
              id: group.id,
              name: group.name,
              description: group.description,
              member_count: memberCount,
              created_at: group.created_at,
            },
            inviteValid: true,
            userIsMember,
          },
        },
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get invite preview API error:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred while retrieving group preview',
        error: (error as any)?.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/groups/invite/:inviteCode
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
