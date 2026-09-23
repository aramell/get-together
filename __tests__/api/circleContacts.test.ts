/**
 * @jest-environment node
 *
 * Overrides the project's default jsdom environment (jest.config.js) for this
 * file only -- jsdom's built-in Response has no static .json(), which
 * NextResponse.json() needs (see __tests__/api/circles.test.ts for the same
 * override).
 */
import { POST } from '@/app/api/circles/[circleId]/contacts/route';
import { DELETE } from '@/app/api/circles/[circleId]/contacts/[contactId]/route';
import { NextRequest } from 'next/server';
import * as authLib from '@/lib/api/auth';
import * as circleService from '@/lib/services/circleService';

jest.mock('@/lib/api/auth');
jest.mock('@/lib/services/circleService');

describe('POST /api/circles/[circleId]/contacts', () => {
  const mockUserId = 'user-456';
  const circleId = 'circle-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds a phone contact (AC1)', async () => {
    const mockRequest = {
      json: async () => ({ type: 'phone', value: '+15550001234' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.addContactByPhone as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Contact added',
      data: { id: 'contact-1', type: 'phone', displayName: '+1 555 ***-1234' },
    });

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(201);
    expect(circleService.addContactByPhone).toHaveBeenCalledWith(circleId, mockUserId, '+15550001234');
  });

  it('adds a username contact (AC2)', async () => {
    const mockRequest = {
      json: async () => ({ type: 'user', value: 'jane@example.com' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.addContactByUsername as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Contact added',
      data: { id: 'contact-2', type: 'user', displayName: 'Jane Doe' },
    });

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(201);
    expect(circleService.addContactByUsername).toHaveBeenCalledWith(circleId, mockUserId, 'jane@example.com');
  });

  it('returns 401 when unauthenticated', async () => {
    const mockRequest = {
      json: async () => ({ type: 'phone', value: '+15550001234' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(401);
    expect(circleService.addContactByPhone).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid JSON', async () => {
    const mockRequest = {
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(400);
  });

  it('returns 422 on malformed request body', async () => {
    const mockRequest = {
      json: async () => ({ type: 'carrier-pigeon', value: 'x' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(422);
    expect(circleService.addContactByPhone).not.toHaveBeenCalled();
    expect(circleService.addContactByUsername).not.toHaveBeenCalled();
  });

  it('returns 422 when the service reports a validation error (AC3)', async () => {
    const mockRequest = {
      json: async () => ({ type: 'phone', value: '555-000-1234' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.addContactByPhone as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Please enter a valid phone number including country code (e.g., +1 555 000 1234)',
      errorCode: 'VALIDATION_ERROR',
    });

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(422);
  });

  it('returns 404 when the circle is not found', async () => {
    const mockRequest = {
      json: async () => ({ type: 'phone', value: '+15550001234' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.addContactByPhone as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Circle not found',
      errorCode: 'NOT_FOUND',
    });

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(404);
  });

  it('returns 403 when the circle belongs to another user', async () => {
    const mockRequest = {
      json: async () => ({ type: 'phone', value: '+15550001234' }),
    } as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.addContactByPhone as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Not authorized',
      errorCode: 'FORBIDDEN',
    });

    const response = await POST(mockRequest, { params: Promise.resolve({ circleId }) });

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/circles/[circleId]/contacts/[contactId]', () => {
  const mockUserId = 'user-456';
  const circleId = 'circle-1';
  const contactId = 'contact-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes a contact (AC6)', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.removeContact as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Contact removed',
    });

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId, contactId }) });

    expect(response.status).toBe(200);
    expect(circleService.removeContact).toHaveBeenCalledWith(circleId, contactId, mockUserId);
  });

  it('returns 401 when unauthenticated', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(null);

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId, contactId }) });

    expect(response.status).toBe(401);
    expect(circleService.removeContact).not.toHaveBeenCalled();
  });

  it('returns 404 when the contact is not found', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.removeContact as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Contact not found',
      errorCode: 'NOT_FOUND',
    });

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId, contactId }) });

    expect(response.status).toBe(404);
  });

  it('returns 403 when the circle belongs to another user', async () => {
    const mockRequest = {} as NextRequest;

    (authLib.getUserIdFromRequest as jest.Mock).mockResolvedValue(mockUserId);
    (circleService.removeContact as jest.Mock).mockResolvedValue({
      success: false,
      message: 'Not authorized',
      errorCode: 'FORBIDDEN',
    });

    const response = await DELETE(mockRequest, { params: Promise.resolve({ circleId, contactId }) });

    expect(response.status).toBe(403);
  });
});
