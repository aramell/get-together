/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as memberGET } from '@/app/api/groups/[groupId]/events/[eventId]/dashboard-widgets/route';
import { GET as publicGET } from '@/app/api/events/public/[publicToken]/dashboard-widgets/route';
import { getEventWidgetLayout, getEventTypeKey } from '@/lib/services/dashboardWidgetsService';
import { getEventByPublicToken } from '@/lib/db/queries';
import { getUserIdFromBearerToken } from '@/lib/api/auth';
import { defaultWidgetLayout } from '@/lib/dashboard/widgetRegistry';

jest.mock('@/lib/services/dashboardWidgetsService');
jest.mock('@/lib/db/queries');
jest.mock('@/lib/api/auth');

const token = 'a'.repeat(64);

describe('dashboard-widgets routes: event_type (Story 14.8)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getEventWidgetLayout as jest.Mock).mockResolvedValue({
      success: true,
      data: defaultWidgetLayout(),
      customized: false,
    });
  });

  it('member route returns the event type', async () => {
    (getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (getEventTypeKey as jest.Mock).mockResolvedValue('dinner');

    const res = await memberGET(new NextRequest('http://localhost/api'), {
      params: Promise.resolve({ groupId: 'g1', eventId: 'e1' }),
    });
    const body = await res.json();

    expect(body.event_type).toBe('dinner');
    expect(getEventTypeKey).toHaveBeenCalledWith('e1');
  });

  it('member route returns null for an event with no type', async () => {
    (getUserIdFromBearerToken as jest.Mock).mockResolvedValue('user-1');
    (getEventTypeKey as jest.Mock).mockResolvedValue(null);

    const res = await memberGET(new NextRequest('http://localhost/api'), {
      params: Promise.resolve({ groupId: 'g1', eventId: 'e1' }),
    });

    expect((await res.json()).event_type).toBeNull();
  });

  it('public route returns event_type and never group_id', async () => {
    (getEventByPublicToken as jest.Mock).mockResolvedValue({
      id: 'e1',
      group_id: 'g1',
      status: 'active',
      event_type: 'dinner',
    });

    const res = await publicGET(new NextRequest('http://localhost/api'), {
      params: Promise.resolve({ publicToken: token }),
    });
    const body = await res.json();

    expect(body.event_type).toBe('dinner');
    expect(Object.keys(body)).not.toContain('group_id');
    expect(Object.keys(body.data ?? {})).not.toContain('group_id');
  });

  it('public route returns null event_type for an untyped event', async () => {
    (getEventByPublicToken as jest.Mock).mockResolvedValue({ id: 'e1', group_id: 'g1', status: 'active' });

    const res = await publicGET(new NextRequest('http://localhost/api'), {
      params: Promise.resolve({ publicToken: token }),
    });

    expect((await res.json()).event_type).toBeNull();
  });
});
