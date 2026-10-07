import { NextRequest, NextResponse } from 'next/server';
import {
  getEventWidgetLayout,
  getEventTypeKey,
  updateEventWidgetLayout,
  resetEventWidgetLayout,
} from '@/lib/services/dashboardWidgetsService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

type RouteParams = { params: Promise<{ groupId: string; eventId: string }> };

const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};

function failure(result: { error?: string; errorCode?: string }, fallback: string): NextResponse {
  const status = (result.errorCode && STATUS_BY_CODE[result.errorCode]) || 500;
  if (status === 500) {
    return NextResponse.json(
      { success: false, error: result.error || fallback, errorCode: 'INTERNAL_ERROR' },
      { status }
    );
  }
  return NextResponse.json(
    { success: false, error: result.error, errorCode: result.errorCode },
    { status }
  );
}

async function authenticate(
  request: NextRequest,
  params: RouteParams['params']
): Promise<{ groupId: string; eventId: string; userId: string } | NextResponse> {
  const { groupId, eventId } = await Promise.resolve(params);

  if (!groupId || typeof groupId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Invalid group ID', errorCode: 'INVALID_GROUP_ID' },
      { status: 400 }
    );
  }
  if (!eventId || typeof eventId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Invalid event ID', errorCode: 'INVALID_EVENT_ID' },
      { status: 400 }
    );
  }

  const userId = await getUserIdFromBearerToken(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  return { groupId, eventId, userId };
}

/**
 * GET /api/groups/:groupId/events/:eventId/dashboard-widgets
 * Effective layout for the event (event override, else group, else default)
 * plus `customized` (true when the event has its own layout).
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticate(request, params);
    if (auth instanceof NextResponse) return auth;

    const result = await getEventWidgetLayout(auth.groupId, auth.eventId, auth.userId);
    if (!result.success) return failure(result, 'Failed to get dashboard layout');

    return NextResponse.json({
      success: true,
      data: result.data,
      customized: result.customized ?? false,
      event_type: await getEventTypeKey(auth.eventId),
      message: 'Dashboard layout retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/events/:eventId/dashboard-widgets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/:groupId/events/:eventId/dashboard-widgets
 * Save the event's own layout. Body: { widgets: WidgetLayoutItem[] } (full layout).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticate(request, params);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    if (!Array.isArray(body.widgets)) {
      return NextResponse.json(
        { success: false, error: 'widgets must be an array', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await updateEventWidgetLayout(auth.groupId, auth.eventId, auth.userId, body.widgets);
    if (!result.success) return failure(result, 'Failed to update dashboard layout');

    return NextResponse.json({
      success: true,
      data: result.data,
      customized: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/groups/:groupId/events/:eventId/dashboard-widgets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/:groupId/events/:eventId/dashboard-widgets
 * Reset the event to the group default layout (deletes its rows).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const auth = await authenticate(request, params);
    if (auth instanceof NextResponse) return auth;

    const result = await resetEventWidgetLayout(auth.groupId, auth.eventId, auth.userId);
    if (!result.success) return failure(result, 'Failed to reset dashboard layout');

    return NextResponse.json({
      success: true,
      data: result.data,
      customized: false,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/groups/:groupId/events/:eventId/dashboard-widgets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
