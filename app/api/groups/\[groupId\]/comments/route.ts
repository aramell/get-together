import { NextRequest, NextResponse } from 'next/server';
import { getSubFromJWT } from '@/lib/auth/jwt';
import { getGroupCommentsService } from '@/lib/services/commentService';
import { z } from 'zod';

// Validation schema for filter query parameters
const filterQuerySchema = z.object({
  content_type: z.enum(['all', 'event', 'wishlist']).default('all'),
  author_id: z.string().uuid().optional().nullable(),
  search_query: z.string().max(200).optional().nullable(),
  sort_by: z.enum(['newest', 'oldest', 'author']).default('newest'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/groups/[groupId]/comments
 * Retrieve comments from both events and wishlist items with advanced filtering
 *
 * Query parameters:
 * - content_type: 'all' | 'event' | 'wishlist' (default: 'all')
 * - author_id: UUID of author to filter by (optional)
 * - search_query: Search term for comment content, author names, target names (optional)
 * - sort_by: 'newest' | 'oldest' | 'author' (default: 'newest')
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Success response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "comments": [
 *       {
 *         "id": "uuid",
 *         "created_by": "user-sub",
 *         "content": "Great event idea!",
 *         "created_at": "2026-03-18T10:00:00Z",
 *         "display_name": "Alice",
 *         "avatar_url": "https://...",
 *         "target_id": "event-or-item-uuid",
 *         "target_type": "event" | "wishlist",
 *         "target_name": "Event Title or Item Title"
 *       }
 *     ],
 *     "totalCount": 25,
 *     "page": 1,
 *     "pageSize": 20,
 *     "totalPages": 2,
 *     "filters": {
 *       "content_type": "all",
 *       "author_id": null,
 *       "search_query": null,
 *       "sort_by": "newest"
 *     }
 *   }
 * }
 *
 * Error responses:
 * - 400: Invalid filter parameters
 * - 401: Unauthorized (no authentication)
 * - 403: Forbidden (not a group member)
 * - 404: Group not found
 * - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    // Extract user from JWT token
    const userId = await getSubFromJWT(request);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          errorCode: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);

    let filters: z.infer<typeof filterQuerySchema>;
    try {
      filters = filterQuerySchema.parse({
        content_type: searchParams.get('content_type') || 'all',
        author_id: searchParams.get('author_id'),
        search_query: searchParams.get('search_query'),
        sort_by: searchParams.get('sort_by') || 'newest',
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
      });
    } catch (error) {
      const zodError = error instanceof z.ZodError ? error.errors[0].message : 'Invalid parameters';
      return NextResponse.json(
        {
          success: false,
          message: `Invalid filter parameters: ${zodError}`,
          errorCode: 'BAD_REQUEST',
        },
        { status: 400 }
      );
    }

    // Calculate offset from page number
    const offset = (filters.page - 1) * filters.limit;

    // Call service to get comments with filters
    const result = await getGroupCommentsService(params.groupId, userId, {
      content_type: filters.content_type as 'all' | 'event' | 'wishlist',
      author_id: filters.author_id,
      search_query: filters.search_query,
      sort_by: filters.sort_by as 'newest' | 'oldest' | 'author',
      limit: filters.limit,
      offset,
    });

    // Handle service errors
    if (!result.success) {
      const statusCode =
        result.errorCode === 'FORBIDDEN'
          ? 403
          : result.errorCode === 'NOT_FOUND'
            ? 404
            : result.errorCode === 'BAD_REQUEST'
              ? 400
              : 500;

      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('GET /api/groups/[groupId]/comments error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch comments',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
