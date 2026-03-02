import { NextRequest, NextResponse } from 'next/server';
import { searchUsers } from '@/lib/db/queries/invitations';

/**
 * GET /api/groups/{groupId}/invite-search?q={query}&limit=10&offset=0
 * Search users to invite to a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate search query
    if (!q || q.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query must be at least 2 characters',
          errorCode: 'INVALID_SEARCH_QUERY',
        },
        { status: 400 }
      );
    }

    if (q.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search query too long',
          errorCode: 'INVALID_SEARCH_QUERY',
        },
        { status: 400 }
      );
    }

    const result = await searchUsers(q, groupId, limit, offset);

    return NextResponse.json(
      {
        success: true,
        users: result.users,
        total: result.total,
        hasMore: offset + limit < result.total,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search users',
        errorCode: 'SEARCH_FAILED',
      },
      { status: 500 }
    );
  }
}
