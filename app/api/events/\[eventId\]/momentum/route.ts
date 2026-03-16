import { NextRequest, NextResponse } from 'next/server';
import { getEventMomentum } from '@/lib/services/eventService';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const result = await getEventMomentum(params.eventId);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching event momentum:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch event momentum',
      },
      { status: 500 }
    );
  }
}
