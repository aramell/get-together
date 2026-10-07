import { NextRequest, NextResponse } from 'next/server';
import { listEventNotes, addEventNote } from '@/lib/services/eventNotesService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';
import { noteErrorResponse } from '@/lib/api/notesRouteHelpers';

type Ctx = { params: Promise<{ groupId: string; eventId: string }> };

const unauthorized = () =>
  NextResponse.json(
    { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
    { status: 401 }
  );

/** GET /api/groups/:groupId/events/:eventId/notes -- members only. */
export async function GET(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { groupId, eventId } = await Promise.resolve(params);
    if (!groupId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }
    const userId = await getUserIdFromBearerToken(request);
    if (!userId) return unauthorized();

    const result = await listEventNotes(eventId, groupId, userId);
    if (!result.success) return noteErrorResponse(result);
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error in GET notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/** POST /api/groups/:groupId/events/:eventId/notes -- any group member. */
export async function POST(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { groupId, eventId } = await Promise.resolve(params);
    if (!groupId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }
    const userId = await getUserIdFromBearerToken(request);
    if (!userId) return unauthorized();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (!body || typeof body.title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await addEventNote(eventId, groupId, userId, {
      title: body.title,
      url: body.url,
      body: body.body,
    });
    if (!result.success) return noteErrorResponse(result);
    return NextResponse.json({ success: true, data: result.data, message: result.message }, { status: 201 });
  } catch (error) {
    console.error('Error in POST notes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
