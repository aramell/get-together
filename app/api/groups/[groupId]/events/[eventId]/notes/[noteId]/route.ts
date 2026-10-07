import { NextRequest, NextResponse } from 'next/server';
import { updateEventNote, deleteEventNote } from '@/lib/services/eventNotesService';
import { getUserIdFromBearerToken } from '@/lib/api/auth';
import { noteErrorResponse } from '@/lib/api/notesRouteHelpers';

type Ctx = { params: Promise<{ groupId: string; eventId: string; noteId: string }> };

const unauthorized = () =>
  NextResponse.json(
    { success: false, error: 'Missing or invalid authorization header', errorCode: 'UNAUTHORIZED' },
    { status: 401 }
  );

/** PATCH -- author or group admin. */
export async function PATCH(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { groupId, eventId, noteId } = await Promise.resolve(params);
    if (!groupId || !eventId || !noteId) {
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
    const updates: { title?: string; url?: string | null; body?: string | null } = {};
    if (body?.title !== undefined) updates.title = body.title;
    if (body?.url !== undefined) updates.url = body.url;
    if (body?.body !== undefined) updates.body = body.body;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update', errorCode: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const result = await updateEventNote(eventId, groupId, noteId, userId, updates);
    if (!result.success) return noteErrorResponse(result);
    return NextResponse.json({ success: true, data: result.data, message: result.message });
  } catch (error) {
    console.error('Error in PATCH note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/** DELETE -- author or group admin. */
export async function DELETE(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const { groupId, eventId, noteId } = await Promise.resolve(params);
    if (!groupId || !eventId || !noteId) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', errorCode: 'INVALID_PARAMS' },
        { status: 400 }
      );
    }
    const userId = await getUserIdFromBearerToken(request);
    if (!userId) return unauthorized();

    const result = await deleteEventNote(eventId, groupId, noteId, userId);
    if (!result.success) return noteErrorResponse(result);
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error in DELETE note:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
