/**
 * @jest-environment node
 *
 * Overrides the project's default jsdom environment (jest.config.js) for this
 * file only -- jsdom's built-in Response has no static .json(), which
 * NextResponse.json() needs (see Story 9.1's __tests__/api/sms-request.test.ts
 * for the same override and the baseline failures it documents).
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/sms/rerequest/route';
import { hashPhoneNumber, generateMagicToken, checkAndRecordRateLimit, sendMagicLinkSms } from '@/lib/services/smsService';
import { getTokenTargetContext } from '@/lib/services/magicLinkService';
import { createToken } from '@/lib/db/queries/smsTokens';

// Explicit factories (not bare jest.mock(path)) so jest never loads the real
// smsService module, which pulls in @aws-sdk/client-sns's ESM browser build
// -- that fails ts-jest's CJS transform since node_modules isn't transpiled
// (same issue documented in Story 9.1's sms-request.test.ts).
jest.mock('@/lib/services/smsService', () => ({
  hashPhoneNumber: jest.fn(),
  generateMagicToken: jest.fn(),
  checkAndRecordRateLimit: jest.fn(),
  sendMagicLinkSms: jest.fn(),
}));
jest.mock('@/lib/services/magicLinkService', () => ({
  getTokenTargetContext: jest.fn(),
}));
jest.mock('@/lib/db/queries/smsTokens', () => ({
  createToken: jest.fn(),
}));

const mockHashPhoneNumber = hashPhoneNumber as jest.MockedFunction<typeof hashPhoneNumber>;
const mockGenerateMagicToken = generateMagicToken as jest.MockedFunction<typeof generateMagicToken>;
const mockCheckAndRecordRateLimit = checkAndRecordRateLimit as jest.MockedFunction<typeof checkAndRecordRateLimit>;
const mockSendMagicLinkSms = sendMagicLinkSms as jest.MockedFunction<typeof sendMagicLinkSms>;
const mockGetTokenTargetContext = getTokenTargetContext as jest.MockedFunction<typeof getTokenTargetContext>;
const mockCreateToken = createToken as jest.MockedFunction<typeof createToken>;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/auth/sms/rerequest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/sms/rerequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHashPhoneNumber.mockReturnValue('hashed-phone');
    mockCheckAndRecordRateLimit.mockReturnValue(true);
    mockGenerateMagicToken.mockReturnValue({
      rawToken: 'new-raw-token',
      tokenHash: 'new-token-hash',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    mockGetTokenTargetContext.mockResolvedValue(null);
    mockCreateToken.mockResolvedValue({
      id: 'token-id',
      phone_hash: 'hashed-phone',
      token_hash: 'new-token-hash',
      target_type: null,
      target_id: null,
      expires_at: new Date().toISOString(),
      used_at: null,
      created_at: new Date().toISOString(),
    });
    mockSendMagicLinkSms.mockResolvedValue(undefined);
  });

  it('generates and sends a new link, returning the exact AC3 success message', async () => {
    const response = await POST(makeRequest({ phoneNumber: '+15550001234' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('New link sent! Check your texts.');
    expect(mockSendMagicLinkSms).toHaveBeenCalledWith('+15550001234', 'new-raw-token');
  });

  it('recovers target context from originalToken and stores it on the new token (AC4)', async () => {
    mockGetTokenTargetContext.mockResolvedValue({
      phone_hash: 'hashed-phone',
      target_type: 'group',
      target_id: '123e4567-e89b-12d3-a456-426614174000',
    });

    await POST(makeRequest({ phoneNumber: '+15550001234', originalToken: 'expired-raw-token' }));

    expect(mockGetTokenTargetContext).toHaveBeenCalledWith('expired-raw-token');
    expect(mockCreateToken).toHaveBeenCalledWith(
      'hashed-phone',
      'new-token-hash',
      expect.any(Date),
      'group',
      '123e4567-e89b-12d3-a456-426614174000'
    );
  });

  it('ignores client-supplied targetType/targetId even when originalToken context also resolves (access control)', async () => {
    mockGetTokenTargetContext.mockResolvedValue({
      phone_hash: 'hashed-phone',
      target_type: 'event',
      target_id: '123e4567-e89b-12d3-a456-426614174000',
    });

    await POST(
      makeRequest({
        phoneNumber: '+15550001234',
        originalToken: 'expired-raw-token',
        // A client can still send these (e.g. an old/external caller), but
        // the route must never let them override the verified originalToken
        // context, and must never use them as a target on their own.
        targetType: 'group',
        targetId: '00000000-0000-0000-0000-000000000000',
      })
    );

    expect(mockCreateToken).toHaveBeenCalledWith(
      'hashed-phone',
      'new-token-hash',
      expect.any(Date),
      'event',
      '123e4567-e89b-12d3-a456-426614174000'
    );
  });

  it('ignores originalToken context when the token belonged to a different phone number (access control)', async () => {
    mockHashPhoneNumber.mockReturnValue('hashed-phone-of-requester');
    mockGetTokenTargetContext.mockResolvedValue({
      phone_hash: 'hashed-phone-of-original-recipient',
      target_type: 'group',
      target_id: '123e4567-e89b-12d3-a456-426614174000',
    });

    await POST(makeRequest({ phoneNumber: '+15559998888', originalToken: 'someone-elses-token' }));

    expect(mockCreateToken).toHaveBeenCalledWith(
      'hashed-phone-of-requester',
      'new-token-hash',
      expect.any(Date),
      undefined,
      undefined
    );
  });

  it('does not fall back to client-supplied targetType/targetId when originalToken context is not found (access control)', async () => {
    mockGetTokenTargetContext.mockResolvedValue(null);

    await POST(
      makeRequest({
        phoneNumber: '+15550001234',
        originalToken: 'expired-raw-token',
        targetType: 'group',
        targetId: '123e4567-e89b-12d3-a456-426614174000',
      })
    );

    expect(mockCreateToken).toHaveBeenCalledWith('hashed-phone', 'new-token-hash', expect.any(Date), undefined, undefined);
  });

  it('never trusts a client-supplied targetType/targetId with no originalToken at all -- the direct self-join vector (access control)', async () => {
    await POST(
      makeRequest({
        phoneNumber: '+15550001234',
        targetType: 'group',
        targetId: '123e4567-e89b-12d3-a456-426614174000',
      })
    );

    expect(mockGetTokenTargetContext).not.toHaveBeenCalled();
    expect(mockCreateToken).toHaveBeenCalledWith('hashed-phone', 'new-token-hash', expect.any(Date), undefined, undefined);
  });

  it('does not look up target context when no originalToken is provided', async () => {
    await POST(makeRequest({ phoneNumber: '+15550001234' }));

    expect(mockGetTokenTargetContext).not.toHaveBeenCalled();
  });

  it('returns 422 for an invalid phone number', async () => {
    const response = await POST(makeRequest({ phoneNumber: 'not-a-number' }));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('VALIDATION_ERROR');
    expect(mockSendMagicLinkSms).not.toHaveBeenCalled();
  });

  it('returns 429 with the exact AC5 message when rate limited, without sending SMS', async () => {
    mockCheckAndRecordRateLimit.mockReturnValue(false);

    const response = await POST(makeRequest({ phoneNumber: '+15550001234' }));
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.message).toBe('Too many requests. Please wait a few minutes before trying again.');
    expect(mockCreateToken).not.toHaveBeenCalled();
    expect(mockSendMagicLinkSms).not.toHaveBeenCalled();
  });

  it('does not reactivate the old token -- only a new token is created', async () => {
    await POST(makeRequest({ phoneNumber: '+15550001234', originalToken: 'expired-raw-token' }));

    expect(mockCreateToken).toHaveBeenCalledTimes(1);
    expect(mockCreateToken).toHaveBeenCalledWith('hashed-phone', 'new-token-hash', expect.any(Date), undefined, undefined);
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
