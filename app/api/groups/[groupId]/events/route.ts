import { NextRequest, NextResponse } from 'next/server';
import { getGroupEvents } from '@/lib/services/eventService';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const result = await getGroupEvents(params.groupId);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching group events:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching events',
        error: error.message || 'UNKNOWN_ERROR',
        errorCode: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
