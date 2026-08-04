import { NextRequest, NextResponse } from 'next/server';
import { claimLogisticsSeat, unclaimLogisticsSeat } from '@/lib/services/eventLogisticsService';
import { getSubFromJWT } from '@/lib/auth/jwt';

function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  return getSubFromJWT(token);
}

function statusForErrorCode(errorCode?: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
    case 'CAPACITY_REACHED':
      return 409;
    default:
      return 500;
  }
}

/**
 * POST /api/groups/:groupId/events/:eventId/logistics/:itemId/claims
 * Claim an open seat on a 'carpool' logistics item. Rejected with 409 if
 * capacity is already reached or the caller already holds a claim.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; itemId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await Promise.resolve(params);

    if (!groupId || !eventId || !itemId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await claimLogisticsSeat(eventId, groupId, itemId, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, errorCode: result.errorCode },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json(
      { success: true, data: result.data, message: result.message },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/groups/:groupId/events/:eventId/logistics/:itemId/claims:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/events/:eventId/logistics/:itemId/claims
 * Remove the caller's own claim. The claimant is derived from the JWT, not a
 * URL/body param, so there's no separate "is this claim mine" check needed.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; eventId: string; itemId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId, eventId, itemId } = await Promise.resolve(params);

    if (!groupId || !eventId || !itemId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }

    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await unclaimLogisticsSeat(eventId, groupId, itemId, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message, errorCode: result.errorCode },
        { status: statusForErrorCode(result.errorCode) }
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Error in DELETE /api/groups/:groupId/events/:eventId/logistics/:itemId/claims:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
