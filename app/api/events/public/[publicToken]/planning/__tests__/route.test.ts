/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/services/publicPlanningService', () => ({
  getPublicEventPlanning: jest.fn(),
}));

const { getPublicEventPlanning } = require('@/lib/services/publicPlanningService');

describe('GET /api/events/public/[publicToken]/planning', () => {
  const validToken = 'a'.repeat(64);

  const makeRequest = () => ({} as NextRequest);

  beforeEach(() => {
    jest.clearAllMocks();
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
});
