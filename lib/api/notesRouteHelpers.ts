import { NextResponse } from 'next/server';

const STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
};

// Maps a failed eventNotesService result to an HTTP response.
export function noteErrorResponse(result: { error?: string; message?: string; errorCode?: string }) {
  const status = (result.errorCode && STATUS[result.errorCode]) || 500;
  return NextResponse.json(
    {
      success: false,
      error: status === 500 ? result.error || result.message || 'Internal error' : result.message || result.error,
      errorCode: status === 500 ? 'INTERNAL_ERROR' : result.errorCode,
    },
    { status }
  );
}
