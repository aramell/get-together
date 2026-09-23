import { NextRequest, NextResponse } from 'next/server';
import { getWidgetLayout, updateWidgetLayout } from '@/lib/services/dashboardWidgetsService';
import { getUserGroupRole } from '@/lib/db/queries';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

/**
 * GET /api/groups/:groupId/dashboard-widgets
 * Current per-group dashboard widget layout (position + visibility for all
 * 5 widgets). Requires group membership (any role) -- reuses the "any
 * member" getUserGroupRole idiom, not Story 2.8's admin-only pattern.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId } = await Promise.resolve(params);

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID', errorCode: 'INVALID_GROUP_ID' },
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

    const userRole = await getUserGroupRole(groupId, userId);
    if (!userRole) {
      return NextResponse.json(
        { success: false, error: 'You must be a group member to view the dashboard layout', errorCode: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const result = await getWidgetLayout(groupId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get dashboard layout', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Dashboard layout retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/dashboard-widgets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/:groupId/dashboard-widgets
 * Replace the group's dashboard widget layout (reorder and/or hide).
 * Requires group membership (any role). Body: { widgets: WidgetLayoutItem[] }
 * -- the complete 5-widget layout, as sent by the optimistic customize-mode UI.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
): Promise<NextResponse> {
  try {
    const { groupId } = await Promise.resolve(params);

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid group ID', errorCode: 'INVALID_GROUP_ID' },
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

    const body = await request.json();

    if (!Array.isArray(body.widgets)) {
      return NextResponse.json(
        { success: false, error: 'widgets must be an array', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await updateWidgetLayout(groupId, userId, body.widgets);

    if (!result.success) {
      if (result.errorCode === 'VALIDATION_ERROR') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, error: result.error, errorCode: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update dashboard layout', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    console.error('Error in PATCH /api/groups/:groupId/dashboard-widgets:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
