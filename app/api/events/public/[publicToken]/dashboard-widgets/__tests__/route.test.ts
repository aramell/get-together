/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db/queries', () => ({
  getEventByPublicToken: jest.fn(),
}));

jest.mock('@/lib/services/dashboardWidgetsService', () => ({
  getWidgetLayout: jest.fn(),
}));

const { getEventByPublicToken } = require('@/lib/db/queries');
const { getWidgetLayout } = require('@/lib/services/dashboardWidgetsService');

describe('GET /api/events/public/[publicToken]/dashboard-widgets', () => {
  const validToken = 'a'.repeat(64);

  const makeRequest = () => ({} as NextRequest);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 for a token that is too short', async () => {
    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: 'short' }) });

    expect(response.status).toBe(404);
    expect(getEventByPublicToken).not.toHaveBeenCalled();
  });

  it('returns 404 when the event is not found', async () => {
    getEventByPublicToken.mockResolvedValue(null);

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.errorCode).toBe('EVENT_NOT_FOUND');
    expect(getWidgetLayout).not.toHaveBeenCalled();
  });

  it('returns 410 when the event was cancelled', async () => {
    getEventByPublicToken.mockResolvedValue({ id: 'event-1', group_id: 'group-1', status: 'cancelled' });

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.errorCode).toBe('EVENT_CANCELLED');
  });

  it('returns 200 with the layout, and never echoes group_id', async () => {
    getEventByPublicToken.mockResolvedValue({ id: 'event-1', group_id: 'group-1', status: 'proposal' });
    const layout = [
      { widget_key: 'photos', position: 1, visible: true },
      { widget_key: 'checklist', position: 2, visible: false },
    ];
    getWidgetLayout.mockResolvedValue({ success: true, data: layout });

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getWidgetLayout).toHaveBeenCalledWith('group-1');
    expect(data.data).toEqual(layout);
    expect(JSON.stringify(data)).not.toContain('group-1');
  });

  it('falls back to the default layout for a group with no rows yet', async () => {
    getEventByPublicToken.mockResolvedValue({ id: 'event-1', group_id: 'group-1', status: 'proposal' });
    const defaultLayout = [
      { widget_key: 'photos', position: 1, visible: true },
      { widget_key: 'checklist', position: 2, visible: true },
      { widget_key: 'timeline', position: 3, visible: true },
      { widget_key: 'logistics', position: 4, visible: true },
      { widget_key: 'polls', position: 5, visible: true },
    ];
    getWidgetLayout.mockResolvedValue({ success: true, data: defaultLayout });

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });
    const data = await response.json();

    expect(data.data).toEqual(defaultLayout);
  });

  it('returns 500 when the service reports failure', async () => {
    getEventByPublicToken.mockResolvedValue({ id: 'event-1', group_id: 'group-1', status: 'proposal' });
    getWidgetLayout.mockResolvedValue({ success: false, error: 'db down', errorCode: 'INTERNAL_ERROR' });

    const response = await GET(makeRequest(), { params: Promise.resolve({ publicToken: validToken }) });

    expect(response.status).toBe(500);
  });
});
