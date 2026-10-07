import { NextRequest, NextResponse } from 'next/server';
import { getLogisticsCategories, updateLogisticsCategories } from '@/lib/services/logisticsCategoriesService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';

/**
 * GET /api/groups/:groupId/logistics-categories
 * The group's logistics categories (stored rows, else the built-in defaults)
 * plus `customized`. Requires group membership.
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

    const result = await getLogisticsCategories(groupId, userId);

    if (!result.success) {
      if (result.errorCode === 'FORBIDDEN') {
        return NextResponse.json(
          { success: false, error: result.message, errorCode: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to get logistics categories', errorCode: 'INTERNAL_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Logistics categories retrieved successfully',
    });
  } catch (error: any) {
    console.error('Error in GET /api/groups/:groupId/logistics-categories:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/:groupId/logistics-categories
 * Replace the group's category list. Group admins only.
 * Body: { categories: { key?, label, mode }[] } -- the complete list in order.
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

    if (!Array.isArray(body.categories)) {
      return NextResponse.json(
        { success: false, error: 'categories must be an array', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await updateLogisticsCategories(groupId, userId, body.categories);

    if (!result.success) {
      const message = result.message || result.error;
      switch (result.errorCode) {
        case 'VALIDATION_ERROR':
          return NextResponse.json(
            { success: false, error: message, errorCode: 'VALIDATION_ERROR' },
            { status: 400 }
          );
        case 'FORBIDDEN':
          return NextResponse.json({ success: false, error: message, errorCode: 'FORBIDDEN' }, { status: 403 });
        case 'CATEGORY_IN_USE':
          return NextResponse.json(
            { success: false, error: message, errorCode: 'CATEGORY_IN_USE' },
            { status: 409 }
          );
        case 'MODE_LOCKED':
          return NextResponse.json(
            { success: false, error: message, errorCode: 'CATEGORY_IN_USE' },
            { status: 400 }
          );
        default:
          return NextResponse.json(
            { success: false, error: 'Failed to update logistics categories', errorCode: 'INTERNAL_ERROR' },
            { status: 500 }
          );
      }
    }

    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error: any) {
    console.error('Error in PATCH /api/groups/:groupId/logistics-categories:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
