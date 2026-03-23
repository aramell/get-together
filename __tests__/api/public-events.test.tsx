/**
 * Public Events API Tests
 * Story 7-3: Public Event Links (Non-Member RSVP)
 * Coverage: AC1, AC2, AC3, AC4, AC5, AC7, AC10
 */

import { POST, GET } from '@/app/api/events/public/[publicToken]/route';
import { NextRequest } from 'next/server';
import * as dbQueries from '@/lib/db/queries';
import * as dbClient from '@/lib/db/client';

// Mock database modules
jest.mock('@/lib/db/queries');
jest.mock('@/lib/db/client');

const mockGetEventByPublicToken = dbQueries.getEventByPublicToken as jest.Mock;
const mockCreateOrUpdatePublicRsvp = dbQueries.createOrUpdatePublicRsvp as jest.Mock;
const mockGetPublicRsvpsByEventId = dbQueries.getPublicRsvpsByEventId as jest.Mock;
const mockQuery = dbClient.query as jest.Mock;

// Sample event for testing
const mockEvent = {
  id: 'event-123',
  group_id: 'group-123',
  title: 'Pizza Night',
  description: 'Join us for pizza!',
  date: '2026-04-01T19:00:00Z',
  threshold: 5,
  status: 'proposal',
  created_at: '2026-03-23T10:00:00Z',
};

const mockPublicToken = 'a'.repeat(32);

describe('Public Events API - GET /api/events/public/[publicToken]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AC2: Should return event details for valid token', async () => {
    mockGetEventByPublicToken.mockResolvedValue(mockEvent);
    mockGetPublicRsvpsByEventId.mockResolvedValue({ in: 0, maybe: 0, out: 0 });
    mockQuery.mockResolvedValue({ rows: [] });

    const mockRequest = {
      json: async () => ({}),
    } as unknown as NextRequest;

    const response = await GET(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Pizza Night');
    expect(data.data.momentum).toEqual({ in: 0, maybe: 0, out: 0 });
  });

  it('AC7: Should return 404 for invalid token', async () => {
    mockGetEventByPublicToken.mockResolvedValue(null);

    const mockRequest = {
      json: async () => ({}),
    } as unknown as NextRequest;

    const response = await GET(mockRequest, { params: { publicToken: 'invalid' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('EVENT_NOT_FOUND');
  });

  it('AC7: Should return 410 for cancelled event', async () => {
    const cancelledEvent = { ...mockEvent, status: 'cancelled' };
    mockGetEventByPublicToken.mockResolvedValue(cancelledEvent);

    const mockRequest = {
      json: async () => ({}),
    } as unknown as NextRequest;

    const response = await GET(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.errorCode).toBe('EVENT_CANCELLED');
  });

  it('AC10: Should calculate momentum combining authenticated + public RSVPs', async () => {
    mockGetEventByPublicToken.mockResolvedValue(mockEvent);
    mockGetPublicRsvpsByEventId.mockResolvedValue({ in: 2, maybe: 1, out: 0 });
    mockQuery.mockResolvedValue({
      rows: [
        { status: 'in', count: 3 },
        { status: 'maybe', count: 1 },
      ],
    });

    const mockRequest = {
      json: async () => ({}),
    } as unknown as NextRequest;

    const response = await GET(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(data.data.momentum).toEqual({
      in: 5, // 3 authenticated + 2 public
      maybe: 2, // 1 authenticated + 1 public
      out: 0,
    });
  });
});

describe('Public Events API - POST /api/events/public/[publicToken]/rsvp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AC3: Should accept valid RSVP submission', async () => {
    const rsvpData = {
      email: 'friend@example.com',
      name: 'Friend Name',
      status: 'in' as const,
    };

    mockGetEventByPublicToken.mockResolvedValue(mockEvent);
    mockCreateOrUpdatePublicRsvp.mockResolvedValue({
      id: 'rsvp-123',
      event_id: mockEvent.id,
      email: rsvpData.email,
      name: rsvpData.name,
      status: rsvpData.status,
      created_at: '2026-03-23T10:00:00Z',
      updated_at: '2026-03-23T10:00:00Z',
    });
    mockGetPublicRsvpsByEventId.mockResolvedValue({ in: 1, maybe: 0, out: 0 });
    mockQuery.mockResolvedValue({ rows: [] });

    const mockRequest = {
      json: async () => rsvpData,
    } as unknown as NextRequest;

    const response = await POST(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.rsvp.email).toBe(rsvpData.email);
  });

  it('AC7: Should validate email format', async () => {
    const rsvpData = {
      email: 'invalid-email',
      name: 'Friend',
      status: 'in',
    };

    mockGetEventByPublicToken.mockResolvedValue(mockEvent);

    const mockRequest = {
      json: async () => rsvpData,
    } as unknown as NextRequest;

    const response = await POST(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('AC3: Should allow optional name field', async () => {
    const rsvpData = {
      email: 'friend@example.com',
      status: 'maybe',
    };

    mockGetEventByPublicToken.mockResolvedValue(mockEvent);
    mockCreateOrUpdatePublicRsvp.mockResolvedValue({
      id: 'rsvp-123',
      event_id: mockEvent.id,
      email: rsvpData.email,
      name: null,
      status: rsvpData.status,
      created_at: '2026-03-23T10:00:00Z',
      updated_at: '2026-03-23T10:00:00Z',
    });
    mockGetPublicRsvpsByEventId.mockResolvedValue({ in: 0, maybe: 1, out: 0 });
    mockQuery.mockResolvedValue({ rows: [] });

    const mockRequest = {
      json: async () => rsvpData,
    } as unknown as NextRequest;

    const response = await POST(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('AC3: Should validate RSVP status enum', async () => {
    const rsvpData = {
      email: 'friend@example.com',
      status: 'invalid_status',
    };

    mockGetEventByPublicToken.mockResolvedValue(mockEvent);

    const mockRequest = {
      json: async () => rsvpData,
    } as unknown as NextRequest;

    const response = await POST(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
  });

  it('AC4: Should return updated momentum after RSVP', async () => {
    const rsvpData = {
      email: 'friend@example.com',
      status: 'in',
    };

    mockGetEventByPublicToken.mockResolvedValue(mockEvent);
    mockCreateOrUpdatePublicRsvp.mockResolvedValue({
      id: 'rsvp-123',
      event_id: mockEvent.id,
      email: rsvpData.email,
      name: null,
      status: rsvpData.status,
      created_at: '2026-03-23T10:00:00Z',
      updated_at: '2026-03-23T10:00:00Z',
    });
    mockGetPublicRsvpsByEventId.mockResolvedValue({ in: 5, maybe: 2, out: 1 });
    mockQuery.mockResolvedValue({ rows: [] });

    const mockRequest = {
      json: async () => rsvpData,
    } as unknown as NextRequest;

    const response = await POST(mockRequest, { params: { publicToken: mockPublicToken } });
    const data = await response.json();

    expect(data.data.momentum).toEqual({
      in: 5,
      maybe: 2,
      out: 1,
    });
    expect(data.message).toContain('Thanks!');
  });
});
