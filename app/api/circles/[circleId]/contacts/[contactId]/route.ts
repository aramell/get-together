import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/api/auth';
import { removeContact } from '@/lib/services/circleService';

function statusForErrorCode(errorCode?: string): number {
  switch (errorCode) {
    case 'NOT_FOUND':
      return 404;
    case 'FORBIDDEN':
      return 403;
    default:
      return 500;
  }
}

/**
 * DELETE /api/circles/{circleId}/contacts/{contactId}
 * Remove a contact from a social circle
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ circleId: string; contactId: string }> }
) {
  try {
    const { circleId, contactId } = await params;
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const result = await removeContact(circleId, contactId, userId);

    if (!result.success) {
      return NextResponse.json(result, { status: statusForErrorCode(result.errorCode) });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error removing circle contact:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while removing the contact',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
