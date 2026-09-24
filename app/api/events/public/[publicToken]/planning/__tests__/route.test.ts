/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/publicPlanningService', () => ({
  getPublicEventPlanning: jest.fn(),
}));

jest.mock('@/lib/api/auth', () => ({
  getUserIdFromBearerToken: jest.fn(),
}));

const { getPublicEventPlanning } = require('@/lib/services/publicPlanningService');
const { getUserIdFromBearerToken } = require('@/lib/api/auth');

describe('GET /api/events/public/[publicToken]/planning', () => {
  const validToken = 'a'.repeat(64);

  const makeRequest = (authHeader?: string) =>
    ({
      headers: { get: (name: string) => (name === 'authorization' ? authHeader ?? null : null) },
    }) as unknown as NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    getUserIdFromBearerToken.mockResolvedValue(null);
  });

  it('returns 404 for a token that is too short', async () => {
    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: 'short' }) });

    expect(response.status).toBe(404);
    expect(getPublicEventPlanning).not.toHaveBeenCalled();
  });

  it('returns 404 when the event is not found', async () => {
    getPublicEventPlanning.mockResolvedValue({
      success: false,
      message: 'Event not found or link has expired',
    });

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.errorCode).toBe('EVENT_NOT_FOUND');
  });

  it('returns 410 when the event was cancelled', async () => {
    getPublicEventPlanning.mockResolvedValue({
      success: false,
      message: 'This event is no longer available',
    });

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });

    expect(response.status).toBe(410);
    const data = await response.json();
    expect(data.errorCode).toBe('EVENT_CANCELLED');
  });

  it('returns 200 with checklist/logistics/timeline data on success', async () => {
    const planningData = {
      checklist: [{ id: 'chk-1', title: 'Bring firewood', is_checked: false, assignee_first_name: 'Andrew' }],
      logistics: [],
      timeline: [],
    };
    getPublicEventPlanning.mockResolvedValue({ success: true, data: planningData });

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual(planningData);
  });

  it('resolves an anonymous request with no requestingUserId', async () => {
    getPublicEventPlanning.mockResolvedValue({ success: true, data: {} });

    await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });

    expect(getUserIdFromBearerToken).toHaveBeenCalled();
    expect(getPublicEventPlanning).toHaveBeenCalledWith(validToken, null);
  });

  it('passes the verified user ID through for an authenticated request', async () => {
    getUserIdFromBearerToken.mockResolvedValue('user-andrew');
    getPublicEventPlanning.mockResolvedValue({ success: true, data: { group_id: 'group-1' } });

    const response = await GET(makeRequest('Bearer valid-token'), {
      params: Promise.resolve({ publicToken: validToken }),
    });
    const data = await response.json();

    expect(getPublicEventPlanning).toHaveBeenCalledWith(validToken, 'user-andrew');
    expect(data.data.group_id).toBe('group-1');
  });
});
