/**
 * @jest-environment node
 *
 * Overrides the project's default jsdom environment (jest.config.js) for this
 * file only. jsdom's built-in Response has no static .json(), which
 * NextResponse.json() needs -- a pre-existing gap in the default test env
 * (rsvp.test.ts, login.test.ts, and others hit the same failure at baseline).
 * The node environment's native fetch Request/Response doesn't have that gap.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/sms/request/route';
import { hashPhoneNumber, generateMagicToken, checkAndRecordRateLimit, sendMagicLinkSms } from '@/lib/services/smsService';
import { createToken } from '@/lib/db/queries/smsTokens';

// Explicit factories (not bare jest.mock(path)) so jest never loads the real
// smsService module, which pulls in @aws-sdk/client-sns's ESM browser build
// -- that fails ts-jest's CJS transform since node_modules isn't transpiled.
jest.mock('@/lib/services/smsService', () => ({
  hashPhoneNumber: jest.fn(),
  generateMagicToken: jest.fn(),
  checkAndRecordRateLimit: jest.fn(),
  sendMagicLinkSms: jest.fn(),
}));
jest.mock('@/lib/db/queries/smsTokens', () => ({
  createToken: jest.fn(),
}));

const mockHashPhoneNumber = hashPhoneNumber as jest.MockedFunction<typeof hashPhoneNumber>;
const mockGenerateMagicToken = generateMagicToken as jest.MockedFunction<typeof generateMagicToken>;
const mockCheckAndRecordRateLimit = checkAndRecordRateLimit as jest.MockedFunction<typeof checkAndRecordRateLimit>;
const mockSendMagicLinkSms = sendMagicLinkSms as jest.MockedFunction<typeof sendMagicLinkSms>;
const mockCreateToken = createToken as jest.MockedFunction<typeof createToken>;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/auth/sms/request', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/sms/request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHashPhoneNumber.mockReturnValue('hashed-phone');
    mockCheckAndRecordRateLimit.mockReturnValue(true);
    mockGenerateMagicToken.mockReturnValue({
      rawToken: 'raw-token',
      tokenHash: 'token-hash',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    mockCreateToken.mockResolvedValue({
      id: 'token-id',
      phone_hash: 'hashed-phone',
      token_hash: 'token-hash',
      target_type: null,
      target_id: null,
      expires_at: new Date().toISOString(),
      used_at: null,
      created_at: new Date().toISOString(),
    });
    mockSendMagicLinkSms.mockResolvedValue(undefined);
  });

  it('returns 200 and a generic success message for a valid phone number (AC3)', async () => {
    const response = await POST(makeRequest({ phoneNumber: '+15550001234' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('+15550001234');
  });

  it('generates a token, stores it, and dispatches the SMS in order', async () => {
    await POST(makeRequest({ phoneNumber: '+15550001234' }));

    expect(mockHashPhoneNumber).toHaveBeenCalledWith('+15550001234');
    expect(mockCheckAndRecordRateLimit).toHaveBeenCalledWith('hashed-phone');
    expect(mockCreateToken).toHaveBeenCalledWith(
      'hashed-phone',
      'token-hash',
      expect.any(Date),
      undefined,
      undefined
    );
    expect(mockSendMagicLinkSms).toHaveBeenCalledWith('+15550001234', 'raw-token');
  });

  it('passes through optional targetType/targetId', async () => {
    await POST(
      makeRequest({
        phoneNumber: '+15550001234',
        targetType: 'group',
        targetId: '123e4567-e89b-12d3-a456-426614174000',
      })
    );

    expect(mockCreateToken).toHaveBeenCalledWith(
      'hashed-phone',
      'token-hash',
      expect.any(Date),
      'group',
      '123e4567-e89b-12d3-a456-426614174000'
    );
  });

  it('returns 422 for an invalid phone number (AC2)', async () => {
    const response = await POST(makeRequest({ phoneNumber: 'not-a-number' }));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
    expect(mockSendMagicLinkSms).not.toHaveBeenCalled();
  });

  it('returns 429 when the rate limit is exceeded, without sending SMS (AC5)', async () => {
    mockCheckAndRecordRateLimit.mockReturnValue(false);

    const response = await POST(makeRequest({ phoneNumber: '+15550001234' }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('RATE_LIMITED');
    expect(mockCreateToken).not.toHaveBeenCalled();
    expect(mockSendMagicLinkSms).not.toHaveBeenCalled();
  });

  it('returns the same success response for a number with no existing account (AC6)', async () => {
    const response = await POST(makeRequest({ phoneNumber: '+15559999999' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('Check your texts');
  });

  it('returns 500 and never leaks the phone number when the SMS provider fails', async () => {
    mockSendMagicLinkSms.mockRejectedValue(new Error('SNS unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(makeRequest({ phoneNumber: '+15550001234' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('5550001234');
    }

    consoleSpy.mockRestore();
  });

  it('returns 422 for a missing phone number', async () => {
    const response = await POST(makeRequest({}));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
  });
});
