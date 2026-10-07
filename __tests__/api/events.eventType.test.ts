/** @jest-environment node */
import { POST } from '@/app/api/groups/[groupId]/events/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/eventService', () => ({ createEvent: jest.fn(), getGroupEvents: jest.fn() }));
jest.mock('@/lib/api/auth', () => ({ getUserIdFromRequest: jest.fn().mockResolvedValue('u1') }));
jest.mock('@/lib/services/circleInviteService', () => ({ bulkInviteCircleToEvent: jest.fn() }));

const { createEvent } = require('@/lib/services/eventService');

const post = (body: any) =>
  POST({ json: async () => body, headers: new Headers() } as unknown as NextRequest, {
    params: Promise.resolve({ groupId: 'g1' }),
  });

const future = () => new Date(Date.now() + 86400000).toISOString();

describe('POST /api/groups/[groupId]/events event_type (Story 14.7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createEvent.mockResolvedValue({ success: true, message: 'ok', data: { event: { id: 'e1' } } });
  });

  it('rejects an unknown event type with 400 VALIDATION_ERROR and writes nothing', async () => {
    const res = await post({ title: 'x', date: future(), event_type: 'rave' });
    expect(res.status).toBe(400);
    expect((await res.json()).errorCode).toBe('VALIDATION_ERROR');
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('passes a valid event_type through to createEvent', async () => {
    const res = await post({ title: 'x', date: future(), event_type: 'dinner' });
    expect(res.status).toBe(201);
    expect(createEvent).toHaveBeenCalledWith('g1', 'u1', expect.objectContaining({ event_type: 'dinner' }));
  });

  it('omitting event_type is fine', async () => {
    const res = await post({ title: 'x', date: future() });
    expect(res.status).toBe(201);
  });
});
